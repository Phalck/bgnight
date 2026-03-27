import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/players/[id] - Get player details
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
    const player = await prisma.player.findFirst({
      where: {
        id,
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
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    return NextResponse.json(player);
  } catch (error) {
    console.error('Failed to fetch player:', error);
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 });
  }
}

// PUT /api/players/[id] - Update player name
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }
    
    const trimmedName = name.trim();
    
    // Verify the player belongs to the user
    const player = await prisma.player.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    // Prevent empty names for self-players
    if (player.isSelfPlayer && (!trimmedName || trimmedName.length === 0)) {
      return NextResponse.json(
        { error: 'Self-player name cannot be empty' },
        { status: 400 }
      );
    }
    
    // Check for duplicate name (case-insensitive, excluding current player)
    const existingPlayer = await prisma.player.findFirst({
      where: {
        userId: session.user.id,
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
        id: {
          not: id,
        },
      },
    });
    
    if (existingPlayer) {
      return NextResponse.json({ error: 'A player with this name already exists' }, { status: 409 });
    }
    
    // Update player name
    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: { name: trimmedName },
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
    
    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error('Failed to update player:', error);
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
  }
}

// DELETE /api/players/[id] - Soft delete a player
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    // Verify the player belongs to the user
    const player = await prisma.player.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    // Prevent deleting self-player
    if (player.isSelfPlayer) {
      return NextResponse.json(
        { error: 'Cannot delete your self-player' },
        { status: 403 }
      );
    }
    
    // Soft delete by setting isActive to false
    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: { isActive: false },
    });
    
    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error('Failed to delete player:', error);
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  }
}
