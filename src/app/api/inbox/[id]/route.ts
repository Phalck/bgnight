import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/inbox/[id] - Delete a message
export async function DELETE(
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

    await prisma.inboxMessage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
