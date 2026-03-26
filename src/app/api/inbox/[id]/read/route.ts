import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/inbox/[id]/read - Mark message as read
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the message belongs to the user
    const message = await prisma.inboxMessage.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const updatedMessage = await prisma.inboxMessage.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark message as read' },
      { status: 500 }
    );
  }
}
