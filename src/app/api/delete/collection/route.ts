import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get count before deletion
    const count = await prisma.game.count({
      where: { userId: session.user.id },
    });

    // Delete all games (cascade will handle playLogs and plannedGames)
    await prisma.game.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ 
      success: true, 
      deleted: count,
      message: `Deleted ${count} games from your collection` 
    });
  } catch (error) {
    console.error('Delete collection error:', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}