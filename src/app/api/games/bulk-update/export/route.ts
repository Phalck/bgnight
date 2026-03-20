import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateChanges } from '@/lib/bulk-update-utils';

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

    const beforeData = bulkSession.beforeData && bulkSession.beforeData !== '' ? JSON.parse(bulkSession.beforeData) : {};
    const afterData = bulkSession.afterData && bulkSession.afterData !== '' ? JSON.parse(bulkSession.afterData) : {};
    
    // Calculate all changes
    const allChanges: Record<string, any> = {};
    for (const gameId of Object.keys(afterData)) {
      const before = beforeData[gameId];
      const after = afterData[gameId];
      allChanges[gameId] = {
        title: after.title,
        changes: calculateChanges(before, after)
      };
    }

    const report = {
      sessionId: bulkSession.id,
      createdAt: bulkSession.createdAt,
      completedAt: bulkSession.completedAt,
      summary: {
        totalGames: bulkSession.totalGames,
        processed: bulkSession.processed,
        autoMatched: bulkSession.autoMatched,
        manualApproved: bulkSession.manualApproved,
        skipped: bulkSession.skipped,
        failed: bulkSession.failed
      },
      skippedGames: bulkSession.skippedGames && bulkSession.skippedGames !== '' ? JSON.parse(bulkSession.skippedGames) : [],
      failedGames: bulkSession.failedGames && bulkSession.failedGames !== '' ? JSON.parse(bulkSession.failedGames) : [],
      changes: allChanges
    };

    return NextResponse.json(report);

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}