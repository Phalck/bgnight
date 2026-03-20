import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getManuallyEditedGames } from '@/lib/manual-edit-tracker';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { overwriteManual } = await request.json();

    // Check for existing active session
    const existingSession = await prisma.bulkUpdateSession.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['preview', 'running', 'paused'] }
      }
    });

    if (existingSession) {
      return NextResponse.json({
        canStart: false,
        error: 'Active session exists',
        existingSession: {
          id: existingSession.id,
          status: existingSession.status,
          canResume: existingSession.status === 'paused',
          progress: {
            total: existingSession.totalGames,
            processed: existingSession.processed,
            percentComplete: Math.round((existingSession.processed / existingSession.totalGames) * 100)
          }
        }
      });
    }

    // Get all user's games
    const games = await prisma.game.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        title: true,
        bggId: true,
      }
    });

    // Get manual edit tracking
    const manualEdits = await getManuallyEditedGames(session.user.id);
    const manualEditMap = new Map(manualEdits.map(m => [m.gameId, m]));

    // Categorize games
    const preview = {
      totalGames: games.length,
      gamesWithBggId: games.filter(g => g.bggId && g.bggId > 0).length,
      gamesNeedingSearch: games.filter(g => !g.bggId || g.bggId <= 0).length,
      gamesWithManualEdits: manualEdits.length,
      manualEditGames: manualEdits.map(m => ({
        gameId: m.gameId,
        title: games.find(g => g.id === m.gameId)?.title || 'Unknown',
        editedFields: m.editedFields,
        editedAt: m.editedAt
      }))
    };

    return NextResponse.json({
      canStart: true,
      preview
    });

  } catch (error) {
    console.error('Bulk update preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}