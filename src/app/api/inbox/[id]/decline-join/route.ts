import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/inbox/[id]/decline-join - Decline a join request
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const organizerId = session.user.id;
    const organizerName = session.user.name || session.user.email || 'The organizer';

    // Get the join request message
    const joinRequest = await prisma.inboxMessage.findFirst({
      where: {
        id,
        userId: organizerId,
        type: 'JOIN_REQUEST',
      },
      include: {
        plannedNight: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
    }

    if (!joinRequest.requester) {
      return NextResponse.json({ error: 'Requester not found' }, { status: 404 });
    }

    const plannedNight = joinRequest.plannedNight;
    const requester = joinRequest.requester;

    // Verify organizer owns this BGN
    if (plannedNight.userId !== organizerId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Mark original request as read
    await prisma.inboxMessage.update({
      where: { id: joinRequest.id },
      data: { isRead: true },
    });

    // Create decline message for requester
    const eventDate = plannedNight.eventDateTime
      ? new Date(plannedNight.eventDateTime).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : 'TBD';

    await prisma.inboxMessage.create({
      data: {
        userId: requester.id,
        type: 'JOIN_RESPONSE',
        title: 'Join Request Declined',
        message: `Your request to join the board game night on ${eventDate} was declined by ${organizerName}.`,
        plannedNightId: plannedNight.id,
        senderName: organizerName,
        eventDateTime: plannedNight.eventDateTime,
        responseType: 'DECLINED',
        joinRequestId: joinRequest.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Request declined',
    });
  } catch (error) {
    console.error('Error declining join request:', error);
    return NextResponse.json(
      { error: 'Failed to decline join request' },
      { status: 500 }
    );
  }
}
