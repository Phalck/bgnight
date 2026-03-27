import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT /api/players/[id]/link - Link player to a user
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
    const { userId: targetUserId } = await request.json();
    
    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Prevent self-linking
    if (targetUserId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot link player to yourself' },
        { status: 400 }
      );
    }
    
    const isAdmin = session.user.role === 'ADMIN';
    
    // Verify the player belongs to the current user (or admin can link any)
    const player = await prisma.player.findFirst({
      where: isAdmin ? { id } : { id, userId: session.user.id },
    });
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    // Check if target user exists and allows linking (unless admin)
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        isActive: true,
        allowPlayerLinking: true,
      },
    });
    
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!targetUser.isActive) {
      return NextResponse.json({ error: 'User is not active' }, { status: 400 });
    }
    
    if (!isAdmin && !targetUser.allowPlayerLinking) {
      return NextResponse.json(
        { error: 'This user does not allow player linking' },
        { status: 403 }
      );
    }
    
    // Update player with linked user
    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: { linkedUserId: targetUserId },
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
    console.error('Failed to link player:', error);
    return NextResponse.json({ error: 'Failed to link player' }, { status: 500 });
  }
}

// DELETE /api/players/[id]/link - Unlink player from user
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
    const isAdmin = session.user.role === 'ADMIN';
    
    // Get player with current link info
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        linkedUser: {
          select: {
            id: true,
          },
        },
      },
    });
    
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    // Prevent unlinking self-player
    if (player.isSelfPlayer) {
      return NextResponse.json(
        { error: 'Cannot unlink your self-player from yourself' },
        { status: 403 }
      );
    }
    
    // Check permission to unlink:
    // - Admin can unlink any player
    // - Player owner can unlink
    // - Linked user can unlink themselves
    const isOwner = player.userId === session.user.id;
    const isLinkedUser = player.linkedUser?.id === session.user.id;
    
    if (!isAdmin && !isOwner && !isLinkedUser) {
      return NextResponse.json(
        { error: 'Not authorized to unlink this player' },
        { status: 403 }
      );
    }
    
    // Remove the link
    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: { linkedUserId: null },
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
    console.error('Failed to unlink player:', error);
    return NextResponse.json({ error: 'Failed to unlink player' }, { status: 500 });
  }
}
