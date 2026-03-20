import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({
      sessionId: bulkSession.id,
      status: bulkSession.status,
      pauseReason: bulkSession.pauseReason,
      rateLimitExpiry: bulkSession.rateLimitExpiry,
      consecutiveFailures: bulkSession.consecutiveFailures,
      progress: {
        total: bulkSession.totalGames,
        processed: bulkSession.processed,
        autoMatched: bulkSession.autoMatched,
        manualApproved: bulkSession.manualApproved,
        skipped: bulkSession.skipped,
        failed: bulkSession.failed,
        percentComplete: Math.round((bulkSession.processed / bulkSession.totalGames) * 100)
      },
      currentGameId: bulkSession.currentGameId,
      skippedGames: bulkSession.skippedGames ? JSON.parse(bulkSession.skippedGames) : [],
      failedGames: bulkSession.failedGames ? JSON.parse(bulkSession.failedGames) : []
    });

  } catch (error) {
    console.error('Bulk update status error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}