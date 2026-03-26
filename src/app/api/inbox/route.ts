import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/inbox - Get all messages for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'all' or 'unread'

    // Auto-cleanup: delete messages where eventDateTime + 24h has passed
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    
    await prisma.inboxMessage.deleteMany({
      where: {
        userId: session.user.id,
        eventDateTime: {
          lt: cutoffDate,
        },
      },
    });

    const messages = await prisma.inboxMessage.findMany({
      where: {
        userId: session.user.id,
        ...(filter === 'unread' ? { isRead: false } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        plannedNight: {
          select: {
            id: true,
            eventDateTime: true,
            location: true,
            inviteExpiresAt: true,
          },
        },
      },
    });

    // Calculate dynamic expiration time
    const messagesWithExpiration = messages.map((msg) => {
      let expiresIn = null;
      if (msg.plannedNight?.inviteExpiresAt) {
        const expiresAt = new Date(msg.plannedNight.inviteExpiresAt);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        expiresIn = diffHours > 0 ? diffHours : 0;
      }

      return {
        ...msg,
        expiresIn,
      };
    });

    return NextResponse.json(messagesWithExpiration);
  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
