import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

// POST /api/inbox/[id]/accept-join - Accept a join request
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
        plannedNight: {
          include: {
            players: true,
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
        },
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

    // Check if requester is already a player
    const isAlreadyPlayer = plannedNight.players.some(
      p => p.linkedUserId === requester.id
    );

    if (!isAlreadyPlayer) {
      // Create a new player for the requester
      const playerName = requester.name || requester.email?.split('@')[0] || 'Guest';
      
      // Check if player with same name exists
      const existingPlayer = await prisma.player.findFirst({
        where: {
          userId: organizerId,
          name: playerName,
          isActive: true,
        },
      });

      let newPlayer;
      if (existingPlayer) {
        // Use existing player and link it
        newPlayer = await prisma.player.update({
          where: { id: existingPlayer.id },
          data: {
            linkedUserId: requester.id,
          },
        });
      } else {
        // Create new player
        newPlayer = await prisma.player.create({
          data: {
            name: playerName,
            userId: organizerId,
            linkedUserId: requester.id,
          },
        });
      }

      // Add player to planned night
      await prisma.plannedGameNight.update({
        where: { id: plannedNight.id },
        data: {
          players: {
            connect: { id: newPlayer.id },
          },
        },
      });
    }

    // Generate or get existing invite token
    let inviteToken = plannedNight.inviteToken;
    if (!inviteToken) {
      inviteToken = randomBytes(32).toString('hex');
      
      // Set default expiration (24 hours from now)
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setHours(inviteExpiresAt.getHours() + 24);

      await prisma.plannedGameNight.update({
        where: { id: plannedNight.id },
        data: {
          inviteToken,
          inviteExpiresAt,
          inviteEnabled: true,
        },
      });
    }

    // Mark original request as read
    await prisma.inboxMessage.update({
      where: { id: joinRequest.id },
      data: { isRead: true },
    });

    // Create acceptance message for requester
    const eventDate = plannedNight.eventDateTime
      ? new Date(plannedNight.eventDateTime).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'TBD';

    const gamesList = plannedNight.games.map(g => g.game.title).join(', ');

    await prisma.inboxMessage.create({
      data: {
        userId: requester.id,
        type: 'JOIN_RESPONSE',
        title: 'Join Request Accepted! 🎉',
        message: `Great news! ${organizerName} has accepted your request to join their board game night on ${eventDate}.\n\nGames: ${gamesList}\n\nYou can now RSVP using the link below.`,
        plannedNightId: plannedNight.id,
        senderName: organizerName,
        inviteToken: inviteToken,
        eventDateTime: plannedNight.eventDateTime,
        responseType: 'ACCEPTED',
        joinRequestId: joinRequest.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Request accepted and user added as player',
    });
  } catch (error) {
    console.error('Error accepting join request:', error);
    return NextResponse.json(
      { error: 'Failed to accept join request' },
      { status: 500 }
    );
  }
}
