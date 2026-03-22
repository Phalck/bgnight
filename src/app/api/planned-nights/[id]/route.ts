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
    const {
      eventDateTime,
      location,
      customMessage,
      playerIds,
      games,
    } = body;
    
    // Update in a transaction
    const updatedNight = await prisma.$transaction(async (tx) => {
      // 1. Update the planned night details
      await tx.plannedGameNight.update({
        where: { id },
        data: {
          eventDateTime: eventDateTime || null,
          location: location || null,
          customMessage: customMessage || null,
        },
      });
      
      // 2. Delete existing planned games
      await tx.plannedGame.deleteMany({
        where: { plannedNightId: id },
      });
      
      // 3. Create new planned games
      if (games && games.length > 0) {
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
      if (playerIds && playerIds.length > 0) {
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
    return NextResponse.json({ error: 'Failed to update planned night' }, { status: 500 });
  }
}
