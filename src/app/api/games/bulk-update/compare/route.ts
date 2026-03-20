import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateChanges } from '@/lib/bulk-update-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const gameId = searchParams.get('gameId');

    if (!sessionId || !gameId) {
      return NextResponse.json({ error: 'Session ID and Game ID required' }, { status: 400 });
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
    
    const before = beforeData[gameId];
    const after = afterData[gameId];
    
    if (!before || !after) {
      return NextResponse.json({ error: 'Game data not found' }, { status: 404 });
    }

    const changes = calculateChanges(before, after);

    return NextResponse.json({
      gameId,
      title: after.title,
      changes
    });

  } catch (error) {
    console.error('Compare error:', error);
    return NextResponse.json({ error: 'Failed to get comparison' }, { status: 500 });
  }
}