import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getGameById, searchBGG } from '@/lib/bgg';
import { clearManualEditTracking } from '@/lib/manual-edit-tracker';
import { getCachedSearchResults, cacheSearchResults } from '@/lib/bgg-search-cache';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();

    const bulkSession = await prisma.bulkUpdateSession.findFirst({
      where: { 
        id: sessionId,
        userId: session.user.id
      }
    });

    if (!bulkSession || bulkSession.status !== 'running') {
      return NextResponse.json({ error: 'No active session' }, { status: 400 });
    }

    // Get unprocessed games
    const processedIds = bulkSession.afterData && bulkSession.afterData !== '' ? JSON.parse(bulkSession.afterData) : {};
    const skippedIds = (bulkSession.skippedGames && bulkSession.skippedGames !== '' ? JSON.parse(bulkSession.skippedGames) : []).map((s: any) => s.gameId);
    const failedIds = (bulkSession.failedGames && bulkSession.failedGames !== '' ? JSON.parse(bulkSession.failedGames) : []).map((f: any) => f.gameId);
    
    const games = await prisma.game.findMany({
      where: { 
        userId: session.user.id,
        id: { 
          notIn: [
            ...Object.keys(processedIds),
            ...skippedIds,
            ...failedIds
          ]
        }
      }
    });

    if (games.length === 0) {
      // All done
      await prisma.bulkUpdateSession.update({
        where: { id: sessionId },
        data: { 
          status: 'completed',
          completedAt: new Date()
        }
      });
      return NextResponse.json({ status: 'completed' });
    }

    const game = games[0];
    
    // Check consecutive failures
    const consecutiveFailures = bulkSession.consecutiveFailures || 0;
    if (consecutiveFailures >= 3) {
      // Stop after 3 consecutive failures
      await prisma.bulkUpdateSession.update({
        where: { id: sessionId },
        data: { 
          status: 'completed',
          completedAt: new Date()
        }
      });
      return NextResponse.json({ 
        status: 'completed',
        stopReason: 'max_consecutive_failures'
      });
    }
    
    // Update current game
    await prisma.bulkUpdateSession.update({
      where: { id: sessionId },
      data: { 
        currentGameId: game.id,
        currentGameTitle: game.title,
        lastActivityAt: new Date()
      }
    });

    // Initialize debug info outside try block so it's available in catch
    let bggDebugInfo: any = {
      initialized: false,
      title: game.title,
      timestamp: new Date().toISOString()
    };

    try {
      // Check if game has manual edits
      const manualEdit = await prisma.manualEditTracking.findUnique({
        where: { gameId: game.id }
      });

      const approvedEdits = bulkSession.manualEditGames && bulkSession.manualEditGames !== '' ? JSON.parse(bulkSession.manualEditGames) : [];
      
      if (manualEdit && !bulkSession.overwriteManual && !approvedEdits.includes(game.id)) {
        // Skip this game
        const skipped = bulkSession.skippedGames && bulkSession.skippedGames !== '' ? JSON.parse(bulkSession.skippedGames) : [];
        skipped.push({
          gameId: game.id,
          title: game.title,
          reason: 'Manual edits - not approved'
        });
        
        await prisma.bulkUpdateSession.update({
          where: { id: sessionId },
          data: { 
            skippedGames: JSON.stringify(skipped),
            skipped: { increment: 1 },
            processed: { increment: 1 }
          }
        });
        
        return NextResponse.json({ 
          status: 'running',
          processed: 1,
          skipped: 1
        });
      }

      // Get BGG data with detailed debugging
      let bggData: any = null;
      
      // Update debug info
      bggDebugInfo = {
        hasBggId: !!(game.bggId && game.bggId > 0),
        bggId: game.bggId || null,
        title: game.title,
        timestamp: new Date().toISOString()
      };
      
      try {
        if (game.bggId && game.bggId > 0) {
          // Auto-match with existing BGG ID
          bggDebugInfo.method = 'getGameById';
          bggData = await getGameById(game.bggId);
          bggDebugInfo.result = bggData ? 'found' : 'not_found';
        } else {
          // Search BGG with cache
          bggDebugInfo.method = 'searchBGG';
          let searchResults = getCachedSearchResults(game.title);
          
          if (!searchResults) {
            bggDebugInfo.usedCache = false;
            searchResults = await searchBGG(game.title);
            cacheSearchResults(game.title, searchResults);
          } else {
            bggDebugInfo.usedCache = true;
          }
          
          bggDebugInfo.searchResultsCount = searchResults.length;
          
          if (searchResults.length === 1) {
            bggData = searchResults[0];
            bggDebugInfo.result = 'single_match';
          } else if (searchResults.length > 1) {
            // Multiple matches - needs manual selection
            bggDebugInfo.result = 'multiple_matches';
            await prisma.bulkUpdateSession.update({
              where: { id: sessionId },
              data: { 
                status: 'paused',
                currentGameId: game.id
              }
            });
            
            return NextResponse.json({
              status: 'manual-match-needed',
              game: {
                id: game.id,
                title: game.title
              },
              candidates: searchResults.map(r => ({
                id: r.id,
                title: r.name,
                year: r.yearPublished
              }))
            });
          } else {
            // No matches
            bggDebugInfo.result = 'no_matches';
            const skipped = bulkSession.skippedGames && bulkSession.skippedGames !== '' ? JSON.parse(bulkSession.skippedGames) : [];
            skipped.push({
              gameId: game.id,
              title: game.title,
              reason: 'No BGG match found',
              debug: bggDebugInfo
            });
            
            await prisma.bulkUpdateSession.update({
              where: { id: sessionId },
              data: { 
                skippedGames: JSON.stringify(skipped),
                skipped: { increment: 1 },
                processed: { increment: 1 }
              }
            });
            
            return NextResponse.json({ 
              status: 'running',
              processed: 1,
              skipped: 1
            });
          }
        }

        if (!bggData) {
          throw new Error('BGG API returned no data');
        }
      } catch (bggError) {
        // Capture detailed error information
        bggDebugInfo.error = bggError instanceof Error ? bggError.message : 'Unknown error';
        bggDebugInfo.errorStack = bggError instanceof Error ? bggError.stack : null;
        throw new Error(`BGG API Error: ${bggDebugInfo.error}`);
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
        mechanics: game.mechanics && game.mechanics !== '' ? JSON.parse(game.mechanics) : [],
        categories: game.categories && game.categories !== '' ? JSON.parse(game.categories) : [],
        designers: game.designers && game.designers !== '' ? JSON.parse(game.designers) : [],
        publishers: game.publishers && game.publishers !== '' ? JSON.parse(game.publishers) : [],
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
        mechanics: updated.mechanics && updated.mechanics !== '' ? JSON.parse(updated.mechanics) : [],
        categories: updated.categories && updated.categories !== '' ? JSON.parse(updated.categories) : [],
        designers: updated.designers && updated.designers !== '' ? JSON.parse(updated.designers) : [],
        publishers: updated.publishers && updated.publishers !== '' ? JSON.parse(updated.publishers) : [],
        complexity: updated.complexity,
        bggRating: updated.bggRating
      };

      // Clear manual edit tracking
      await clearManualEditTracking(game.id);

      // Update session
      const existingBefore = bulkSession.beforeData && bulkSession.beforeData !== '' ? JSON.parse(bulkSession.beforeData) : {};
      const existingAfter = bulkSession.afterData && bulkSession.afterData !== '' ? JSON.parse(bulkSession.afterData) : {};
      
      existingBefore[game.id] = beforeData;
      existingAfter[game.id] = afterData;

      const isAutoMatched = game.bggId && game.bggId > 0;
      
      await prisma.bulkUpdateSession.update({
        where: { id: sessionId },
        data: {
          processed: { increment: 1 },
          autoMatched: isAutoMatched ? { increment: 1 } : undefined,
          manualApproved: !isAutoMatched ? { increment: 1 } : undefined,
          beforeData: JSON.stringify(existingBefore),
          afterData: JSON.stringify(existingAfter),
          consecutiveFailures: 0 // Reset on success
        }
      });

      return NextResponse.json({ 
        status: 'running',
        processed: 1,
        autoMatched: isAutoMatched ? 1 : 0,
        manualApproved: !isAutoMatched ? 1 : 0,
        consecutiveFailures: 0
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log the error for debugging
      console.error(`Error processing game ${game?.id} (${game?.title}):`, errorMessage);
      
      // Check for rate limit error
      if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        const resumeAt = new Date(Date.now() + 10000); // 10 seconds from now
        
        await prisma.bulkUpdateSession.update({
          where: { id: sessionId },
          data: { 
            status: 'paused',
            pauseReason: 'rate_limit',
            rateLimitExpiry: resumeAt,
            lastActivityAt: new Date()
          }
        });
        
        return NextResponse.json({ 
          status: 'paused',
          pauseReason: 'rate_limit',
          resumeAt: resumeAt.toISOString(),
          message: 'Rate limited by BGG. Resuming in 10 seconds.'
        });
      }
      
      // Handle regular failure
      const failed = bulkSession.failedGames && bulkSession.failedGames !== '' ? JSON.parse(bulkSession.failedGames) : [];
      const existingFailed = failed.find((f: any) => f.gameId === game.id);
      const newConsecutiveFailures = consecutiveFailures + 1;
      
      if (existingFailed) {
        existingFailed.retryCount++;
        
        if (bulkSession.retryStrategy === 'retry' && existingFailed.retryCount < 3) {
          // Will retry
          await prisma.bulkUpdateSession.update({
            where: { id: sessionId },
            data: { 
              failedGames: JSON.stringify(failed),
              consecutiveFailures: newConsecutiveFailures
            }
          });
          
          return NextResponse.json({ 
            status: 'running',
            failed: 0,
            willRetry: true,
            consecutiveFailures: newConsecutiveFailures
          });
        }
      } else {
        failed.push({
          gameId: game.id,
          title: game.title,
          error: errorMessage,
          retryCount: 1,
          debug: bggDebugInfo || { error: 'No debug info available' }
        });
      }
      
      await prisma.bulkUpdateSession.update({
        where: { id: sessionId },
        data: { 
          failedGames: JSON.stringify(failed),
          failed: { increment: 1 },
          processed: { increment: 1 },
          consecutiveFailures: newConsecutiveFailures
        }
      });
      
      return NextResponse.json({ 
        status: 'running',
        processed: 1,
        failed: 1,
        consecutiveFailures: newConsecutiveFailures
      });
    }

  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}