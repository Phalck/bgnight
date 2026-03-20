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

    const beforeData = JSON.parse(bulkSession.beforeData || '{}');
    const afterData = JSON.parse(bulkSession.afterData || '{}');
    
    const changes = Object.keys(afterData).map(gameId => {
      const before = beforeData[gameId];
      const after = afterData[gameId];
      
      return {
        gameId,
        title: after.title,
        changes: calculateChanges(before, after),
        timestamp: bulkSession.lastActivityAt
      };
    });

    return NextResponse.json({
      canReview: true,
      changes,
      progress: {
        processed: bulkSession.processed,
        total: bulkSession.totalGames
      }
    });

  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ error: 'Failed to get review' }, { status: 500 });
  }
}