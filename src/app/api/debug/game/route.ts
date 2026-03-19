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

    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    const game = await prisma.game.findFirst({
      where: { 
        id: gameId,
        userId: session.user.id 
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log('[Debug API] Raw database values:', {
      id: game.id,
      title: game.title,
      complexity: game.complexity,
      bggRating: game.bggRating,
      complexityType: typeof game.complexity,
      bggRatingType: typeof game.bggRating
    });

    return NextResponse.json({
      ...game,
      rawComplexity: game.complexity,
      rawBggRating: game.bggRating,
      mechanics: JSON.parse(game.mechanics || '[]'),
      categories: JSON.parse(game.categories || '[]'),
      designers: JSON.parse(game.designers || '[]'),
      publishers: JSON.parse(game.publishers || '[]'),
    });
  } catch (error) {
    console.error('[Debug API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}