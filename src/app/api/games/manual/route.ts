import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Game has a unique constraint on (userId, bggId). Games that are not linked to BGG get a
// random negative id: it can never collide with a real BGG id, and the bulk updater already
// treats bggId <= 0 as "not matched to BGG yet, search by title".
const MAX_UNLINKED_ID = 2_000_000_000;
const MAX_ATTEMPTS = 5;

function randomUnlinkedBggId(): number {
  return -(Math.floor(Math.random() * MAX_UNLINKED_ID) + 1);
}

function isBggIdCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes('bggId') : String(target ?? '').includes('bggId');
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      title,
      bggId: rawBggId,
      thumbnail,
      minPlayers,
      maxPlayers,
      minPlayTime,
      maxPlayTime,
      yearPublished,
      description,
      mechanics,
      categories,
      designers,
      publishers,
      complexity,
      bggRating,
    } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Real BGG id, present when the form was filled from a BoardGameGeek import
    let bggId: number | null = null;
    if (rawBggId !== undefined && rawBggId !== null && rawBggId !== '') {
      bggId = Number(rawBggId);
      if (!Number.isInteger(bggId) || bggId <= 0) {
        return NextResponse.json({ error: 'Invalid BGG ID' }, { status: 400 });
      }

      const existing = await prisma.game.findFirst({
        where: { userId: session.user.id, bggId },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json({ error: 'This game is already in your collection' }, { status: 400 });
      }
    }

    const splitList = (value: unknown) =>
      JSON.stringify(typeof value === 'string' ? value.split(',').map(v => v.trim()).filter(Boolean) : []);

    const data = {
      title,
      thumbnail: thumbnail || null,
      image: null,
      minPlayers: minPlayers || 2,
      maxPlayers: maxPlayers || 4,
      minPlayTime: minPlayTime || null,
      maxPlayTime: maxPlayTime || null,
      yearPublished: yearPublished || null,
      description: description || null,
      mechanics: splitList(mechanics),
      categories: splitList(categories),
      designers: splitList(designers),
      publishers: splitList(publishers),
      complexity: complexity || null,
      bggRating: bggRating || null,
      userId: session.user.id,
    };

    let game;
    for (let attempt = 1; ; attempt++) {
      try {
        game = await prisma.game.create({
          data: { ...data, bggId: bggId ?? randomUnlinkedBggId() },
        });
        break;
      } catch (error) {
        if (!isBggIdCollision(error)) throw error;

        if (bggId !== null) {
          // Added twice at once (double click) between our check and the insert
          return NextResponse.json({ error: 'This game is already in your collection' }, { status: 400 });
        }
        if (attempt >= MAX_ATTEMPTS) throw error;
      }
    }

    return NextResponse.json({
      ...game,
      mechanics: JSON.parse(game.mechanics || '[]'),
      categories: JSON.parse(game.categories || '[]'),
      designers: JSON.parse(game.designers || '[]'),
      publishers: JSON.parse(game.publishers || '[]'),
    });
  } catch (error) {
    console.error('Add game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
