import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/inbox/read-all - Mark all messages as read
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.inboxMessage.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
