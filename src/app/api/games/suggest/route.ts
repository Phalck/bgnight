import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const players = searchParams.get('players');
    const maxTime = searchParams.get('maxTime');
    const mechanics = searchParams.get('mechanics')?.split(',').filter(Boolean) || [];
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];

    if (!players) {
      return NextResponse.json({ error: 'Player count is required' }, { status: 400 });
    }

    const playerCount = Number(players);
    const timeLimit = maxTime ? Number(maxTime) : Infinity;

    const games = await prisma.game.findMany({
      where: { userId: session.user.id },
    });

    // Fetch play logs for all games to get play counts and last played dates
    const playLogs = await prisma.playLog.findMany({
      where: { userId: session.user.id },
      select: {
        gameId: true,
        playedAt: true,
      },
    });

    // Group play logs by gameId
    const playStats = new Map<string, { playCount: number; lastPlayedAt: Date | null }>();
    playLogs.forEach(log => {
      const existing = playStats.get(log.gameId);
      if (existing) {
        existing.playCount++;
        if (log.playedAt && (!existing.lastPlayedAt || log.playedAt > existing.lastPlayedAt)) {
          existing.lastPlayedAt = log.playedAt;
        }
      } else {
        playStats.set(log.gameId, {
          playCount: 1,
          lastPlayedAt: log.playedAt,
        });
      }
    });

    const suggestions = games
      .map(game => {
        const stats = playStats.get(game.id) || { playCount: 0, lastPlayedAt: null };
        const gameMechanics = JSON.parse(game.mechanics || '[]') as string[];
        const gameCategories = JSON.parse(game.categories || '[]') as string[];
        
        const playerFit = playerCount >= game.minPlayers && playerCount <= game.maxPlayers;
        const timeFit = !game.maxPlayTime || game.maxPlayTime <= timeLimit;
        
        const mechanicMatch = mechanics.length === 0 || 
          mechanics.some(m => gameMechanics.some(gm => gm.toLowerCase().includes(m.toLowerCase())));
        
        const categoryMatch = categories.length === 0 ||
          categories.some(c => gameCategories.some(gc => gc.toLowerCase().includes(c.toLowerCase())));

        if (!playerFit || !timeFit) {
          return null;
        }

        let matchScore = 0;
        const reasons: string[] = [];

        if (playerFit) {
          matchScore += 50;
          reasons.push(`Plays with ${playerCount} players`);
        }
        if (timeFit) {
          matchScore += 30;
          reasons.push(`Fits in ${timeLimit} minutes`);
        }
        if (mechanicMatch && mechanics.length > 0) {
          matchScore += 10;
          const matched = mechanics.filter(m => 
            gameMechanics.some(gm => gm.toLowerCase().includes(m.toLowerCase()))
          );
          if (matched.length > 0) {
            reasons.push(`Mechanics: ${matched.join(', ')}`);
          }
        }
        if (categoryMatch && categories.length > 0) {
          matchScore += 10;
          const matched = categories.filter(c => 
            gameCategories.some(gc => gc.toLowerCase().includes(c.toLowerCase()))
          );
          if (matched.length > 0) {
            reasons.push(`Categories: ${matched.join(', ')}`);
          }
        }

        return {
          ...game,
          mechanics: gameMechanics,
          categories: gameCategories,
          designers: JSON.parse(game.designers || '[]'),
          publishers: JSON.parse(game.publishers || '[]'),
          matchScore,
          reasons,
          playCount: stats.playCount,
          lastPlayedAt: stats.lastPlayedAt,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Suggest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
