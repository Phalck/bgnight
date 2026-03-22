import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/planned-nights - Public endpoint to list all planned nights
export async function GET(request: NextRequest) {
  try {
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
      .map(night => ({
        id: night.id,
        eventDateTime: night.eventDateTime,
        location: night.location,
        customMessage: night.customMessage,
        organizer: night.user?.name || 'Anonymous',
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
      }));

    return NextResponse.json(transformedNights);
  } catch (error) {
    console.error('Failed to fetch public planned nights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planned nights' },
      { status: 500 }
    );
  }
}
