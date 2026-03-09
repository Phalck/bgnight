import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const games = await prisma.game.findMany({
      where: { userId: session.user.id },
      select: {
        bggId: true,
        title: true,
        thumbnail: true,
        image: true,
        minPlayers: true,
        maxPlayers: true,
        minPlayTime: true,
        maxPlayTime: true,
        yearPublished: true,
        description: true,
        mechanics: true,
        categories: true,
        designers: true,
        publishers: true,
        artists: true,
        minAge: true,
        complexity: true,
        bggRating: true,
        bggRatingsCount: true,
        bggRank: true,
      },
      orderBy: { title: 'asc' },
    });

    const backupData = {
      exportDate: new Date().toISOString(),
      exportType: 'collection',
      version: '1.0',
      user: session.user.email,
      gameCount: games.length,
      games: games.map(game => ({
        ...game,
        mechanics: game.mechanics ? JSON.parse(game.mechanics) : [],
        categories: game.categories ? JSON.parse(game.categories) : [],
        designers: game.designers ? JSON.parse(game.designers) : [],
        publishers: game.publishers ? JSON.parse(game.publishers) : [],
        artists: game.artists ? JSON.parse(game.artists) : [],
      })),
    };

    return NextResponse.json(backupData);
  } catch (error) {
    console.error('Backup collection error:', error);
    return NextResponse.json({ error: 'Failed to backup collection' }, { status: 500 });
  }
}