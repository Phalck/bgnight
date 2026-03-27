import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/planned-nights/[id]/request-join - Request to join a BGN
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
    const userId = session.user.id;
    const userName = session.user.name || session.user.email || 'Someone';

    // Get the planned night with organizer and players
    const plannedNight = await prisma.plannedGameNight.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        players: {
          select: {
            id: true,
            linkedUserId: true,
            name: true,
          },
        },
        games: {
          include: {
            game: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (!plannedNight) {
      return NextResponse.json({ error: 'Game night not found' }, { status: 404 });
    }

    // Check if user is the organizer
    if (plannedNight.userId === userId) {
      return NextResponse.json({ error: 'You cannot request to join your own game night' }, { status: 400 });
    }

    // Check if user is already a player (linked or invited)
    const isAlreadyPlayer = plannedNight.players.some(
      p => p.linkedUserId === userId
    );
    if (isAlreadyPlayer) {
      return NextResponse.json({ error: 'You are already invited to this game night' }, { status: 400 });
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.inboxMessage.findFirst({
      where: {
        plannedNightId: id,
        userId: plannedNight.userId,
        requesterId: userId,
        type: 'JOIN_REQUEST',
        isRead: false,
      },
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending request' }, { status: 400 });
    }

    // Check if organizer has linked a player to this user
    const linkedPlayer = plannedNight.players.find(
      p => p.linkedUserId === userId
    );

    // Build message content
    let messageContent = `${userName} wants to join your board game night`;
    if (linkedPlayer) {
      messageContent += ` (linked to your player: ${linkedPlayer.name})`;
    }
    messageContent += '!';

    const eventDate = plannedNight.eventDateTime
      ? new Date(plannedNight.eventDateTime).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'TBD';

    // Create inbox message for organizer
    const inboxMessage = await prisma.inboxMessage.create({
      data: {
        userId: plannedNight.userId,
        type: 'JOIN_REQUEST',
        title: `Join Request for ${eventDate}`,
        message: messageContent,
        plannedNightId: id,
        senderName: userName,
        requesterId: userId,
        eventDateTime: plannedNight.eventDateTime,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Join request sent',
      inboxMessageId: inboxMessage.id,
    });
  } catch (error) {
    console.error('Error requesting to join:', error);
    return NextResponse.json(
      { error: 'Failed to send join request' },
      { status: 500 }
    );
  }
}
