import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/public/planned-nights - Public endpoint to list all planned nights
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const organizer = searchParams.get('organizer');
    const dateFilter = searchParams.get('dateFilter'); // today, week, month, all
    const upcoming = searchParams.get('upcoming') === 'true';

    // Build where clause
    const where: any = {};

    // Filter by date range
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          where.eventDateTime = {
            gte: startOfDay,
            lt: endOfDay,
          };
          break;
        case 'week':
          const endOfWeek = new Date(startOfDay);
          endOfWeek.setDate(endOfWeek.getDate() + 7);
          where.eventDateTime = {
            gte: startOfDay,
            lt: endOfWeek,
          };
          break;
        case 'month':
          const endOfMonth = new Date(startOfDay);
          endOfMonth.setMonth(endOfMonth.getMonth() + 1);
          where.eventDateTime = {
            gte: startOfDay,
            lt: endOfMonth,
          };
          break;
      }
    }

    // Filter to show only upcoming events (future dates)
    if (upcoming) {
      const now = new Date();
      if (where.eventDateTime) {
        where.eventDateTime.gte = now;
      } else {
        where.eventDateTime = {
          gte: now,
        };
      }
    }

    // Fetch all planned nights
    const plannedNights = await prisma.plannedGameNight.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
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
            linkedUserId: true,
          },
        },
        playerResponses: {
          select: {
            playerId: true,
            status: true,
          },
        },
      },
      orderBy: {
        eventDateTime: 'asc',
      },
    });

    // Get pending join requests for authenticated user
    let pendingRequests: Set<string> = new Set();
    if (userId) {
      const joinRequests = await prisma.inboxMessage.findMany({
        where: {
          requesterId: userId,
          type: 'JOIN_REQUEST',
          isRead: false,
        },
        select: {
          plannedNightId: true,
        },
      });
      pendingRequests = new Set(joinRequests.map(r => r.plannedNightId).filter(Boolean) as string[]);
    }

    // Transform data to include organizer name and RSVP counts only (no player names)
    const transformedNights = plannedNights
      .filter(night => {
        // Filter by organizer name if specified
        if (organizer && organizer !== 'all') {
          const organizerName = night.user?.name || 'Anonymous';
          return organizerName === organizer;
        }
        return true;
      })
      .map(night => {
        const isOwner = userId === night.user.id;
        const isPlayer = night.players.some(p => p.linkedUserId === userId);
        const hasPendingRequest = pendingRequests.has(night.id);

        return {
          id: night.id,
          eventDateTime: night.eventDateTime,
          location: night.location,
          organizer: night.user?.name || 'Anonymous',
          userId: night.user.id,
          games: night.games.map(plannedGame => ({
            id: plannedGame.id,
            game: plannedGame.game,
            youtubeVideoUrl: plannedGame.youtubeVideoUrl,
            voteCount: plannedGame.votes.length,
          })),
          rsvpStats: {
            coming: night.playerResponses.filter(r => r.status === 'coming').length,
            maybe: night.playerResponses.filter(r => r.status === 'maybe').length,
            notComing: night.playerResponses.filter(r => r.status === 'not_coming').length,
            noResponse: night.players.length - night.playerResponses.length,
          },
          // Only include these fields for authenticated users
          ...(userId && {
            isOwner,
            isPlayer,
            hasPendingRequest,
            canRequestJoin: !isOwner && !isPlayer,
          }),
        };
      });

    return NextResponse.json(transformedNights);
  } catch (error) {
    console.error('Failed to fetch public planned nights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planned nights' },
      { status: 500 }
    );
  }
}
