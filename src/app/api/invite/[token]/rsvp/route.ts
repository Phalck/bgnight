import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/invite/[token]/rsvp - Submit RSVP
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json();
    const { playerId, status } = body;

    // Validate status
    const validStatuses = ['coming', 'not_coming', 'maybe'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be coming, not_coming, or maybe' },
        { status: 400 }
      );
    }

    // Find the planned night by token
    const plannedNight = await prisma.plannedGameNight.findUnique({
      where: {
        inviteToken: token,
      },
      include: {
        players: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!plannedNight) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Check if invite is enabled
    if (!plannedNight.inviteEnabled) {
      return NextResponse.json(
        { error: 'This invite link has been disabled' },
        { status: 403 }
      );
    }

    // Check if invite has expired
    if (plannedNight.inviteExpiresAt && new Date() > plannedNight.inviteExpiresAt) {
      return NextResponse.json(
        { 
          error: 'This invite link has expired',
          expired: true,
          organizer: 'Please contact the organizer for a new invite link'
        },
        { status: 410 }
      );
    }

    // Verify the player is actually invited to this night
    const isInvited = plannedNight.players.some(p => p.id === playerId);
    if (!isInvited) {
      return NextResponse.json(
        { error: 'Player is not invited to this game night' },
        { status: 403 }
      );
    }

    // Upsert the player response
    const response = await prisma.playerResponse.upsert({
      where: {
        plannedNightId_playerId: {
          plannedNightId: plannedNight.id,
          playerId: playerId,
        },
      },
      update: {
        status: status,
        respondedAt: new Date(),
      },
      create: {
        plannedNightId: plannedNight.id,
        playerId: playerId,
        status: status,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to submit RSVP:', error);
    return NextResponse.json(
      { error: 'Failed to submit RSVP' },
      { status: 500 }
    );
  }
}