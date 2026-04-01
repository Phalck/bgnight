import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/invite/[token] - Get public invite details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // Get current session (returns null if not logged in)
    const session = await getServerSession(authOptions);

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
            linkedUserId: true,
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

    // Find linked players for current user
    let linkedPlayers: { id: string; name: string }[] = [];
    let currentUser: { id: string; name: string | null; email: string } | null = null;

    if (session?.user?.id) {
      linkedPlayers = plannedNight.players.filter(
        p => p.linkedUserId === session.user.id
      );
      currentUser = {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? '',
      };
    }

    return NextResponse.json({
      id: plannedNight.id,
      eventDateTime: plannedNight.eventDateTime,
      location: plannedNight.location,
      games: gamesWithVotes,
      players: plannedNight.players,
      playerResponses: plannedNight.playerResponses,
      inviteExpiresAt: plannedNight.inviteExpiresAt,
      linkedPlayers: linkedPlayers.map(p => ({
        id: p.id,
        name: p.name,
      })),
      currentUser,
    });
  } catch (error) {
    console.error('Failed to fetch invite:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite' },
      { status: 500 }
    );
  }
}