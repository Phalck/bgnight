import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/planned-nights/[id] - Get single planned night
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    const plannedNight = await prisma.plannedGameNight.findFirst({
      where: {
        id,
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
      return NextResponse.json({ error: 'Planned night not found' }, { status: 404 });
    }

    return NextResponse.json(plannedNight);
  } catch (error) {
    console.error('Failed to fetch planned night:', error);
    return NextResponse.json({ error: 'Failed to fetch planned night' }, { status: 500 });
  }
}

// DELETE /api/planned-nights/[id] - Delete planned night
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    // Verify the planned night belongs to the user
    const plannedNight = await prisma.plannedGameNight.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!plannedNight) {
      return NextResponse.json({ error: 'Planned night not found' }, { status: 404 });
    }
    
    await prisma.plannedGameNight.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete planned night:', error);
    return NextResponse.json({ error: 'Failed to delete planned night' }, { status: 500 });
  }
}

// PATCH /api/planned-nights/[id] - Update planned night
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify the planned night belongs to the user
    const existingNight = await prisma.plannedGameNight.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingNight) {
      return NextResponse.json({ error: 'Planned night not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log('PATCH /api/planned-nights/[id] - Request body:', JSON.stringify(body, null, 2));

    const {
      eventDateTime,
      location,
      playerIds,
      games,
    } = body;

    // Validation
    if (!Array.isArray(games)) {
      return NextResponse.json({ error: 'Games must be an array' }, { status: 400 });
    }

    if (!Array.isArray(playerIds)) {
      return NextResponse.json({ error: 'PlayerIds must be an array' }, { status: 400 });
    }

    // Validate all gameIds exist
    if (games.length > 0) {
      const gameIds = games.map((g: { gameId: string }) => g.gameId);
      const existingGames = await prisma.game.findMany({
        where: {
          id: { in: gameIds },
          userId: session.user.id,
        },
        select: { id: true },
      });

      const existingGameIds = new Set(existingGames.map(g => g.id));
      const invalidGameIds = gameIds.filter((id: string) => !existingGameIds.has(id));

      if (invalidGameIds.length > 0) {
        console.error('Invalid game IDs:', invalidGameIds);
        return NextResponse.json(
          { error: `Invalid game IDs: ${invalidGameIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate all playerIds exist and belong to user
    if (playerIds.length > 0) {
      const existingPlayers = await prisma.player.findMany({
        where: {
          id: { in: playerIds },
          userId: session.user.id,
        },
        select: { id: true },
      });

      const existingPlayerIds = new Set(existingPlayers.map(p => p.id));
      const invalidPlayerIds = playerIds.filter((id: string) => !existingPlayerIds.has(id));

      if (invalidPlayerIds.length > 0) {
        console.error('Invalid player IDs:', invalidPlayerIds);
        return NextResponse.json(
          { error: `Invalid player IDs: ${invalidPlayerIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Parse and validate eventDateTime
    let parsedEventDateTime: Date | null = null;
    if (eventDateTime) {
      try {
        parsedEventDateTime = new Date(eventDateTime);
        if (isNaN(parsedEventDateTime.getTime())) {
          return NextResponse.json({ error: 'Invalid eventDateTime format' }, { status: 400 });
        }
      } catch (e) {
        return NextResponse.json({ error: 'Invalid eventDateTime format' }, { status: 400 });
      }
    }

    // Update in a transaction
    const updatedNight = await prisma.$transaction(async (tx) => {
      // 1. Update the planned night details
      await tx.plannedGameNight.update({
        where: { id },
        data: {
          eventDateTime: parsedEventDateTime,
          location: location || null,
        },
      });

      // 2. Delete existing planned games
      await tx.plannedGame.deleteMany({
        where: { plannedNightId: id },
      });

      // 3. Create new planned games
      if (games.length > 0) {
        await tx.plannedGame.createMany({
          data: games.map((game: {
            gameId: string;
            youtubeVideoId?: string | null;
            youtubeVideoTitle?: string | null;
            youtubeVideoUrl?: string | null;
            order: number;
          }) => ({
            plannedNightId: id,
            gameId: game.gameId,
            youtubeVideoId: game.youtubeVideoId || null,
            youtubeVideoTitle: game.youtubeVideoTitle || null,
            youtubeVideoUrl: game.youtubeVideoUrl || null,
            order: game.order,
          })),
        });
      }

      // 4. Update player relationships
      // First disconnect all existing players
      await tx.plannedGameNight.update({
        where: { id },
        data: {
          players: {
            set: [], // Disconnect all
          },
        },
      });

      // Then connect the new ones
      if (playerIds.length > 0) {
        await tx.plannedGameNight.update({
          where: { id },
          data: {
            players: {
              connect: playerIds.map((playerId: string) => ({ id: playerId })),
            },
          },
        });
      }

      // 5. Fetch and return the updated night with all details
      return tx.plannedGameNight.findUnique({
        where: { id },
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
      });
    });

    return NextResponse.json(updatedNight);
  } catch (error) {
    console.error('Failed to update planned night:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to update planned night';

    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      // Check for specific Prisma errors
      if (error.message.includes('Foreign key constraint')) {
        errorMessage = 'One or more selected games or players no longer exist';
      } else if (error.message.includes('Unique constraint')) {
        errorMessage = 'Duplicate data detected';
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
