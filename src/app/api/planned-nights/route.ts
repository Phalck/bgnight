import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/planned-nights - List all planned nights for user
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const plannedNights = await prisma.plannedGameNight.findMany({
      where: {
        userId: session.user.id,
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
      },
      orderBy: {
        plannedAt: 'desc',
      },
    });
    
    return NextResponse.json(plannedNights);
  } catch (error) {
    console.error('Failed to fetch planned nights:', error);
    return NextResponse.json({ error: 'Failed to fetch planned nights' }, { status: 500 });
  }
}

// POST /api/planned-nights - Create new planned night
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const {
      eventDateTime,
      location,
      customMessage,
      playerIds,
      games,
    } = body;
    
    // Validation
    if (!games || !Array.isArray(games) || games.length === 0) {
      return NextResponse.json({ error: 'At least one game is required' }, { status: 400 });
    }
    
    // Create planned night with games and players
    const plannedNight = await prisma.plannedGameNight.create({
      data: {
        userId: session.user.id,
        eventDateTime: eventDateTime ? new Date(eventDateTime) : null,
        location: location || null,
        customMessage: customMessage || null,
        games: {
          create: games.map((game: any, index: number) => ({
            gameId: game.gameId,
            youtubeVideoId: game.youtubeVideoId || null,
            youtubeVideoTitle: game.youtubeVideoTitle || null,
            youtubeVideoUrl: game.youtubeVideoUrl || null,
            order: index,
          })),
        },
        players: playerIds && playerIds.length > 0 ? {
          connect: playerIds.map((id: string) => ({ id })),
        } : undefined,
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
          },
        },
        players: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return NextResponse.json(plannedNight);
  } catch (error) {
    console.error('Failed to create planned night:', error);
    return NextResponse.json({ error: 'Failed to create planned night' }, { status: 500 });
  }
}
