import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getGameById, BGGGame } from '@/lib/bgg';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const games = await prisma.game.findMany({
      where: { userId: session.user.id },
      orderBy: { title: 'asc' },
    });

    return NextResponse.json(games.map(game => ({
      ...game,
      mechanics: JSON.parse(game.mechanics || '[]'),
      categories: JSON.parse(game.categories || '[]'),
      designers: JSON.parse(game.designers || '[]'),
      publishers: JSON.parse(game.publishers || '[]'),
    })));
  } catch (error) {
    console.error('Get games error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bggId } = await request.json();

    if (!bggId) {
      return NextResponse.json({ error: 'BGG ID is required' }, { status: 400 });
    }

    const bggIdNumber = Number(bggId);

    const ownGame = await prisma.game.findFirst({
      where: { userId: session.user.id, bggId: bggIdNumber },
      select: { id: true },
    });

    if (ownGame) {
      return NextResponse.json({ error: 'Game already in collection' }, { status: 400 });
    }

    // Another account may already have this game: reuse its data to save a BGG request
    const copySource = await prisma.game.findFirst({ where: { bggId: bggIdNumber } });

    let bggGame: BGGGame | null = null;

    if (copySource) {
      bggGame = {
        id: copySource.bggId,
        name: copySource.title,
        thumbnail: copySource.thumbnail || undefined,
        image: copySource.image || undefined,
        minPlayers: copySource.minPlayers,
        maxPlayers: copySource.maxPlayers,
        minPlayTime: copySource.minPlayTime || undefined,
        maxPlayTime: copySource.maxPlayTime || undefined,
        yearPublished: copySource.yearPublished || undefined,
        description: copySource.description || undefined,
        mechanics: JSON.parse(copySource.mechanics || '[]'),
        categories: JSON.parse(copySource.categories || '[]'),
        designers: JSON.parse(copySource.designers || '[]'),
        publishers: JSON.parse(copySource.publishers || '[]'),
        complexity: copySource.complexity ?? undefined,
        bggRating: copySource.bggRating ?? undefined,
      };
    } else {
      bggGame = await getGameById(bggIdNumber);
    }

    if (!bggGame) {
      return NextResponse.json({ error: 'Game not found on BGG' }, { status: 404 });
    }

    // A plain create: this must never touch another account's row
    const game = await prisma.game.create({
      data: {
        bggId: bggIdNumber,
        title: bggGame.name,
        thumbnail: bggGame.thumbnail,
        image: bggGame.image,
        minPlayers: bggGame.minPlayers,
        maxPlayers: bggGame.maxPlayers,
        minPlayTime: bggGame.minPlayTime,
        maxPlayTime: bggGame.maxPlayTime,
        yearPublished: bggGame.yearPublished,
        description: bggGame.description,
        mechanics: JSON.stringify(bggGame.mechanics),
        categories: JSON.stringify(bggGame.categories),
        designers: JSON.stringify(bggGame.designers),
        publishers: JSON.stringify(bggGame.publishers),
        complexity: bggGame.complexity,
        bggRating: bggGame.bggRating,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...game,
      mechanics: bggGame.mechanics,
      categories: bggGame.categories,
      designers: bggGame.designers,
      publishers: bggGame.publishers,
      complexity: bggGame.complexity,
      bggRating: bggGame.bggRating,
    });
  } catch (error) {
    console.error('Add game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
