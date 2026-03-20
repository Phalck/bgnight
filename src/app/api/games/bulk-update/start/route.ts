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

    const { overwriteManual, retryStrategy = 'skip', approvedManualEditGameIds = [] } = await request.json();

    // Get all games
    const games = await prisma.game.findMany({
      where: { userId: session.user.id }
    });

    // Get manual edits
    const manualEdits = await getManuallyEditedGames(session.user.id);
    
    // If not overwriting manual, and there are unapproved manual edits, return them
    if (!overwriteManual && manualEdits.length > 0) {
      const unapprovedGames = manualEdits.filter(
        m => !approvedManualEditGameIds.includes(m.gameId)
      );
      
      if (unapprovedGames.length > 0) {
        return NextResponse.json({
          status: 'needs-approval',
          needsApproval: {
            total: unapprovedGames.length,
            games: unapprovedGames.map(m => ({
              gameId: m.gameId,
              title: games.find(g => g.id === m.gameId)?.title || 'Unknown',
              editedFields: m.editedFields
            }))
          }
        });
      }
    }

    // Create session
    const bulkSession = await prisma.bulkUpdateSession.create({
      data: {
        userId: session.user.id,
        status: 'running',
        totalGames: games.length,
        overwriteManual,
        retryStrategy,
        manualEditGames: JSON.stringify(approvedManualEditGameIds),
        startedAt: new Date()
      }
    });

    // Start processing in background
    // Note: In production, you'd use a background job queue like Bull or SQS
    // For now, we'll trigger processing via a separate API call
    
    return NextResponse.json({
      sessionId: bulkSession.id,
      status: 'running',
      totalGames: games.length
    });

  } catch (error) {
    console.error('Bulk update start error:', error);
    return NextResponse.json(
      { error: 'Failed to start bulk update' },
      { status: 500 }
    );
  }
}