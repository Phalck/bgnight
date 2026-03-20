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

    await prisma.bulkUpdateSession.update({
      where: { id: sessionId },
      data: { 
        status: 'paused',
        lastActivityAt: new Date()
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Pause error:', error);
    return NextResponse.json({ error: 'Failed to pause' }, { status: 500 });
  }
}