import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, gameIds } = await request.json();

    if (!sessionId || !Array.isArray(gameIds) || gameIds.length === 0) {
      return NextResponse.json({ error: 'Session ID and game IDs required' }, { status: 400 });
    }

    const bulkSession = await prisma.bulkUpdateSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id
      }
    });

    if (!bulkSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get current failed games
    const failedGames = bulkSession.failedGames ? JSON.parse(bulkSession.failedGames) : [];
    
    // Remove the retried games from failed list
    const updatedFailedGames = failedGames.filter((game: any) => !gameIds.includes(game.gameId));
    
    // Decrement the failed count
    const newFailedCount = Math.max(0, bulkSession.failed - gameIds.length);
    
    // Reset consecutive failures to give retried games a fresh start
    
    await prisma.bulkUpdateSession.update({
      where: { id: sessionId },
      data: {
        failedGames: JSON.stringify(updatedFailedGames),
        failed: newFailedCount,
        consecutiveFailures: 0,
        status: 'running',
        lastActivityAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Retrying ${gameIds.length} failed game(s)`,
      retriedCount: gameIds.length
    });

  } catch (error) {
    console.error('Retry failed games error:', error);
    return NextResponse.json(
      { error: 'Failed to retry games' },
      { status: 500 }
    );
  }
}