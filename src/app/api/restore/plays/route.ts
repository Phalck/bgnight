import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface PlayBackup {
  id: string;
  game: {
    id: string;
    title: string;
    bggId: number;
  };
  playedAt: string;
  players: { id: string; name: string }[];
  winners: { id: string; name: string }[];
  duration?: number | null;
  location?: string | null;
  rating?: number | null;
  notes?: string | null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    if (!data.plays || !Array.isArray(data.plays)) {
      return NextResponse.json({ error: 'Invalid backup data' }, { status: 400 });
    }

    // Get user's games and players for matching
    const userGames = await prisma.game.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, bggId: true },
    });

    const userPlayers = await prisma.player.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
    });

    const results = {
      imported: 0,
      skipped: 0,
      gameNotFound: 0,
      errors: [] as string[],
    };

    for (const play of data.plays as PlayBackup[]) {
      try {
        // Find matching game
        const matchingGame = userGames.find(g => 
          g.bggId === play.game.bggId || 
          g.title.toLowerCase() === play.game.title.toLowerCase()
        );

        if (!matchingGame) {
          results.gameNotFound++;
          continue;
        }

        // Check if this exact play already exists (same game, date, players)
        const existingPlay = await prisma.playLog.findFirst({
          where: {
            gameId: matchingGame.id,
            userId: session.user.id,
            playedAt: new Date(play.playedAt),
          },
        });

        if (existingPlay) {
          results.skipped++;
          continue;
        }

        // Match or create players
        const playerIds: string[] = [];
        for (const player of play.players) {
          const existingPlayer = userPlayers.find(p => 
            p.name.toLowerCase() === player.name.toLowerCase()
          );
          
          if (existingPlayer) {
            playerIds.push(existingPlayer.id);
          } else {
            // Create new player
            const newPlayer = await prisma.player.create({
              data: {
                name: player.name,
                userId: session.user.id,
              },
            });
            playerIds.push(newPlayer.id);
            userPlayers.push({ id: newPlayer.id, name: newPlayer.name });
          }
        }

        // Match winners
        const winnerIds: string[] = [];
        for (const winner of play.winners) {
          const winnerPlayer = userPlayers.find(p => 
            p.name.toLowerCase() === winner.name.toLowerCase()
          );
          if (winnerPlayer) {
            winnerIds.push(winnerPlayer.id);
          }
        }

        // Create the play log
        await prisma.playLog.create({
          data: {
            gameId: matchingGame.id,
            userId: session.user.id,
            playedAt: new Date(play.playedAt),
            duration: play.duration,
            location: play.location,
            rating: play.rating,
            notes: play.notes,
            players: {
              connect: playerIds.map(id => ({ id })),
            },
            winners: {
              connect: winnerIds.map(id => ({ id })),
            },
          },
        });

        results.imported++;
      } catch (error) {
        console.error(`Failed to import play for ${play.game.title}:`, error);
        results.errors.push(play.game.title);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Restore plays error:', error);
    return NextResponse.json({ error: 'Failed to restore plays' }, { status: 500 });
  }
}