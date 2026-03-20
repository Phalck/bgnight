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

    const { sessionId } = await request.json();

    const bulkSession = await prisma.bulkUpdateSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id
      }
    });

    if (!bulkSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check rate limit cooldown
    if (bulkSession.pauseReason === 'rate_limit' && bulkSession.rateLimitExpiry) {
      const now = new Date();
      const resumeAt = new Date(bulkSession.rateLimitExpiry);
      
      if (now < resumeAt) {
        const secondsLeft = Math.ceil((resumeAt.getTime() - now.getTime()) / 1000);
        return NextResponse.json({ 
          error: 'Rate limit cooldown',
          retryAfter: secondsLeft
        }, { status: 429 });
      }
    }

    await prisma.bulkUpdateSession.update({
      where: { id: sessionId },
      data: { 
        status: 'running',
        lastActivityAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true,
      status: 'running',
      progress: {
        total: bulkSession.totalGames,
        processed: bulkSession.processed,
        percentComplete: Math.round((bulkSession.processed / bulkSession.totalGames) * 100)
      }
    });

  } catch (error) {
    console.error('Resume error:', error);
    return NextResponse.json({ error: 'Failed to resume' }, { status: 500 });
  }
}