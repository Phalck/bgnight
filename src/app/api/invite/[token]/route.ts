import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/invite/[token] - Get public invite details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const plannedNight = await prisma.plannedGameNight.findUnique({
      where: {
        inviteToken: token,
      },
      include: {
        games: {
          include: {
            game: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                minPlayers: true,
                maxPlayers: true,
                maxPlayTime: true,
              },
            },
            votes: {
              select: {
                playerId: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        players: {
          select: {
            id: true,
            name: true,
          },
        },
        playerResponses: {
          select: {
            playerId: true,
            status: true,
            respondedAt: true,
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

    // Calculate vote counts per game
    const gamesWithVotes = plannedNight.games.map(game => ({
      ...game,
      voteCount: game.votes.length,
    }));

    return NextResponse.json({
      id: plannedNight.id,
      eventDateTime: plannedNight.eventDateTime,
      location: plannedNight.location,
      games: gamesWithVotes,
      players: plannedNight.players,
      playerResponses: plannedNight.playerResponses,
      inviteExpiresAt: plannedNight.inviteExpiresAt,
    });
  } catch (error) {
    console.error('Failed to fetch invite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite' },
      { status: 500 }
    );
  }
}