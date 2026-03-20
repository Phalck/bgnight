import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getGameById } from '@/lib/bgg';
import { clearManualEditTracking } from '@/lib/manual-edit-tracker';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, gameId, bggId } = await request.json();

    const bulkSession = await prisma.bulkUpdateSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id
      }
    });

    if (!bulkSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get game
    const game = await prisma.game.findFirst({
      where: { 
        id: gameId,
        userId: session.user.id
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!bggId) {
      // User chose to skip
      const skipped = JSON.parse(bulkSession.skippedGames || '[]');
      skipped.push({
        gameId: game.id,
        title: game.title,
        reason: 'User skipped manual match'
      });
      
      await prisma.bulkUpdateSession.update({
        where: { id: sessionId },
        data: { 
          skippedGames: JSON.stringify(skipped),
          skipped: { increment: 1 },
          processed: { increment: 1 },
          status: 'running'
        }
      });
      
      return NextResponse.json({ success: true, skipped: true });
    }

    // Fetch BGG data
    const bggData = await getGameById(bggId);
    
    if (!bggData) {
      return NextResponse.json({ error: 'BGG game not found' }, { status: 404 });
    }

    // Store before data
    const beforeData = {
      title: game.title,
      description: game.description,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      minPlayTime: game.minPlayTime,
      maxPlayTime: game.maxPlayTime,
      yearPublished: game.yearPublished,
      mechanics: JSON.parse(game.mechanics || '[]'),
      categories: JSON.parse(game.categories || '[]'),
      designers: JSON.parse(game.designers || '[]'),
      publishers: JSON.parse(game.publishers || '[]'),
      complexity: game.complexity,
      bggRating: game.bggRating
    };

    // Update game
    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        title: bggData.name,
        description: bggData.description,
        minPlayers: bggData.minPlayers,
        maxPlayers: bggData.maxPlayers,
        minPlayTime: bggData.minPlayTime,
        maxPlayTime: bggData.maxPlayTime,
        yearPublished: bggData.yearPublished,
        mechanics: JSON.stringify(bggData.mechanics),
        categories: JSON.stringify(bggData.categories),
        designers: JSON.stringify(bggData.designers),
        publishers: JSON.stringify(bggData.publishers),
        complexity: bggData.complexity,
        bggRating: bggData.bggRating,
        thumbnail: bggData.thumbnail,
        image: bggData.image
      }
    });

    // Store after data
    const afterData = {
      title: updated.title,
      description: updated.description,
      minPlayers: updated.minPlayers,
      maxPlayers: updated.maxPlayers,
      minPlayTime: updated.minPlayTime,
      maxPlayTime: updated.maxPlayTime,
      yearPublished: updated.yearPublished,
      mechanics: JSON.parse(updated.mechanics || '[]'),
      categories: JSON.parse(updated.categories || '[]'),
      designers: JSON.parse(updated.designers || '[]'),
      publishers: JSON.parse(updated.publishers || '[]'),
      complexity: updated.complexity,
      bggRating: updated.bggRating
    };

    // Clear manual edit tracking
    await clearManualEditTracking(game.id);

    // Update session
    const existingBefore = JSON.parse(bulkSession.beforeData || '{}');
    const existingAfter = JSON.parse(bulkSession.afterData || '{}');
    
    existingBefore[game.id] = beforeData;
    existingAfter[game.id] = afterData;

    await prisma.bulkUpdateSession.update({
      where: { id: sessionId },
      data: {
        processed: { increment: 1 },
        manualApproved: { increment: 1 },
        beforeData: JSON.stringify(existingBefore),
        afterData: JSON.stringify(existingAfter),
        status: 'running'
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Manual match error:', error);
    return NextResponse.json({ error: 'Failed to apply manual match' }, { status: 500 });
  }
}