import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/plays/stats - Get play statistics
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get total play count
    const totalPlays = await prisma.playLog.count({
      where: { userId: session.user.id },
    });
    
    // Get play count per game
    const gameStats = await prisma.playLog.groupBy({
      by: ['gameId'],
      where: { userId: session.user.id },
      _count: {
        id: true,
      },
    });
    
    const gamePlayCounts = await Promise.all(
      gameStats.map(async (stat) => {
        const game = await prisma.game.findUnique({
          where: { id: stat.gameId },
          select: { id: true, title: true },
        });
        return {
          gameId: stat.gameId,
          title: game?.title || 'Unknown Game',
          playCount: stat._count.id,
        };
      })
    );
    
    // Get player statistics
    const playerStats = await prisma.player.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            playLogs: true,
            wins: true,
          },
        },
      },
    });
    
    return NextResponse.json({
      totalPlays,
      gamePlayCounts,
      playerStats: playerStats.map(p => ({
        id: p.id,
        name: p.name,
        gamesPlayed: p._count.playLogs,
        wins: p._count.wins,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch play stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
