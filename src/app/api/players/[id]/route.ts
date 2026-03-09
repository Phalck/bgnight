import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/players/[id] - Soft delete a player
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
