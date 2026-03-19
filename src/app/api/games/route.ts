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

    const existingGame = await prisma.game.findUnique({
      where: { bggId: Number(bggId) },
    });

    if (existingGame && existingGame.userId === session.user.id) {
      return NextResponse.json({ error: 'Game already in collection' }, { status: 400 });
    }

    let bggGame: BGGGame | null = null;

    if (existingGame) {
      bggGame = {
        id: existingGame.bggId,
        name: existingGame.title,
        thumbnail: existingGame.thumbnail || undefined,
        image: existingGame.image || undefined,
        minPlayers: existingGame.minPlayers,
        maxPlayers: existingGame.maxPlayers,
        minPlayTime: existingGame.minPlayTime || undefined,
        maxPlayTime: existingGame.maxPlayTime || undefined,
        yearPublished: existingGame.yearPublished || undefined,
        description: existingGame.description || undefined,
        mechanics: JSON.parse(existingGame.mechanics || '[]'),
        categories: JSON.parse(existingGame.categories || '[]'),
        designers: JSON.parse(existingGame.designers || '[]'),
        publishers: JSON.parse(existingGame.publishers || '[]'),
      };
    } else {
      bggGame = await getGameById(Number(bggId));
    }

    if (!bggGame) {
      return NextResponse.json({ error: 'Game not found on BGG' }, { status: 404 });
    }

    const game = await prisma.game.upsert({
      where: { bggId: Number(bggId) },
      update: {
        userId: session.user.id,
        complexity: bggGame.complexity,
        bggRating: bggGame.bggRating,
      },
      create: {
        bggId: Number(bggId),
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
