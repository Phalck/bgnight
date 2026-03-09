import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/games/[id]/plays - Get play logs for a specific game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    // Verify the game belongs to the user
    const game = await prisma.game.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    const plays = await prisma.playLog.findMany({
      where: {
        gameId: id,
        userId: session.user.id,
      },
      include: {
        players: {
          select: {
            id: true,
            name: true,
          },
        },
        winners: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        playedAt: 'desc',
      },
    });
    
    return NextResponse.json(plays);
  } catch (error) {
    console.error('Failed to fetch game plays:', error);
    return NextResponse.json({ error: 'Failed to fetch plays' }, { status: 500 });
  }
}

// POST /api/games/[id]/plays - Create a new play log
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    // Verify the game belongs to the user
    const game = await prisma.game.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const {
      playedAt,
      playerIds,
      newPlayers,
      winnerIds,
      duration,
      location,
      rating,
      notes,
    } = body;
    
    // Validation
    if (!playedAt) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'At least one player is required' }, { status: 400 });
    }
    
    // Validate winners are subset of players
    if (winnerIds && Array.isArray(winnerIds)) {
      const allPlayerIds = [...playerIds];
      const invalidWinners = winnerIds.filter(wid => !allPlayerIds.includes(wid));
      if (invalidWinners.length > 0) {
        return NextResponse.json(
          { error: 'Winners must be from the participating players' },
          { status: 400 }
        );
      }
    }
    
    // Create any new players first
    const createdPlayerIds: string[] = [];
    if (newPlayers && Array.isArray(newPlayers) && newPlayers.length > 0) {
      for (const playerName of newPlayers) {
        const trimmedName = playerName.trim();
        if (!trimmedName) continue;
        
        // Check if player already exists (case-insensitive comparison)
        const allPlayers = await prisma.player.findMany({
          where: {
            userId: session.user.id,
          },
        });
        const existingPlayer = allPlayers.find(p => 
          p.name.toLowerCase() === trimmedName.toLowerCase()
        );
        
        if (existingPlayer) {
          // Reactivate if inactive
          if (!existingPlayer.isActive) {
            await prisma.player.update({
              where: { id: existingPlayer.id },
              data: { isActive: true },
            });
          }
          createdPlayerIds.push(existingPlayer.id);
        } else {
          // Create new player
          const newPlayer = await prisma.player.create({
            data: {
              name: trimmedName,
              userId: session.user.id,
            },
          });
          createdPlayerIds.push(newPlayer.id);
        }
      }
    }
    
    // Combine existing and new player IDs
    const allPlayerIds = [...playerIds, ...createdPlayerIds];
    
    // Create the play log
    const playLog = await prisma.playLog.create({
      data: {
        gameId: id,
        userId: session.user.id,
        playedAt: new Date(playedAt),
        duration: duration ? parseInt(duration) : null,
        location: location || null,
        rating: rating ? parseInt(rating) : null,
        notes: notes || null,
        players: {
          connect: allPlayerIds.map((id: string) => ({ id })),
        },
        winners: {
          connect: (winnerIds || []).map((id: string) => ({ id })),
        },
      },
      include: {
        game: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
        players: {
          select: {
            id: true,
            name: true,
          },
        },
        winners: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return NextResponse.json(playLog);
  } catch (error) {
    console.error('Failed to create play log:', error);
    return NextResponse.json({ error: 'Failed to create play log' }, { status: 500 });
  }
}
