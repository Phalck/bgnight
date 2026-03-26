import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/players - List all active players for the user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('all') === 'true';
  
  try {
    const players = await prisma.player.findMany({
      where: {
        userId: session.user.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            playLogs: true,
            wins: true,
          },
        },
        linkedUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return NextResponse.json(players);
  } catch (error) {
    console.error('Failed to fetch players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

// POST /api/players - Create a new player
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }
    
    const trimmedName = name.trim();
    
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
      // If player exists but is inactive, reactivate them
      if (!existingPlayer.isActive) {
        const updatedPlayer = await prisma.player.update({
          where: { id: existingPlayer.id },
          data: { isActive: true },
        });
        return NextResponse.json(updatedPlayer);
      }
      
      return NextResponse.json({ error: 'Player already exists' }, { status: 409 });
    }
    
    const player = await prisma.player.create({
      data: {
        name: trimmedName,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            playLogs: true,
            wins: true,
          },
        },
        linkedUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    return NextResponse.json(player);
  } catch (error) {
    console.error('Failed to create player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}
