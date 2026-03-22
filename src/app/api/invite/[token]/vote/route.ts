import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/invite/[token]/vote - Vote on a game (toggle)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json();
    const { playerId, plannedGameId } = body;

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
        games: {
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

    // Verify the game is part of this night
    const isGameInNight = plannedNight.games.some(g => g.id === plannedGameId);
    if (!isGameInNight) {
      return NextResponse.json(
        { error: 'Game is not part of this game night' },
        { status: 403 }
      );
    }

    // Check if vote already exists
    const existingVote = await prisma.gameVote.findUnique({
      where: {
        plannedNightId_plannedGameId_playerId: {
          plannedNightId: plannedNight.id,
          plannedGameId: plannedGameId,
          playerId: playerId,
        },
      },
    });

    if (existingVote) {
      // Remove the vote (toggle off)
      await prisma.gameVote.delete({
        where: {
          id: existingVote.id,
        },
      });

      return NextResponse.json({ voted: false });
    } else {
      // Add the vote (toggle on)
      await prisma.gameVote.create({
        data: {
          plannedNightId: plannedNight.id,
          plannedGameId: plannedGameId,
          playerId: playerId,
        },
      });

      return NextResponse.json({ voted: true });
    }
  } catch (error) {
    console.error('Failed to toggle vote:', error);
    return NextResponse.json(
      { error: 'Failed to toggle vote' },
      { status: 500 }
    );
  }
}