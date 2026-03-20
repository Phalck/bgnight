import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface GameBackup {
  bggId: number;
  title: string;
  thumbnail?: string | null;
  image?: string | null;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime?: number | null;
  maxPlayTime?: number | null;
  yearPublished?: number | null;
  description?: string | null;
  mechanics: string[];
  categories: string[];
  designers: string[];
  publishers: string[];
  artists: string[];
  minAge?: number | null;
  complexity?: number | null;
  bggRating?: number | null;
  bggRatingsCount?: number | null;
  bggRank?: number | null;
}

interface RestoreRequest {
  games: GameBackup[];
  conflictResolution: 'skip' | 'replace' | 'keepBoth';
  selectedGames?: string[]; // IDs of games to restore (if user selected specific ones)
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: RestoreRequest = await request.json();
    
    if (!data.games || !Array.isArray(data.games)) {
      return NextResponse.json({ error: 'Invalid backup data' }, { status: 400 });
    }

    // Get existing games to check for conflicts
    const existingGames = await prisma.game.findMany({
      where: { userId: session.user.id },
      select: { bggId: true, title: true },
    });

    const existingBggIds = new Set(existingGames.map(g => g.bggId));
    const existingTitles = new Set(existingGames.map(g => g.title.toLowerCase()));

    // Identify conflicts
    const conflicts = data.games.filter(game => 
      existingBggIds.has(game.bggId) || 
      existingTitles.has(game.title.toLowerCase())
    );

    const newGames = data.games.filter(game => 
      !existingBggIds.has(game.bggId) && 
      !existingTitles.has(game.title.toLowerCase())
    );

    // If just checking for conflicts, return the analysis
    if (data.conflictResolution === undefined) {
      return NextResponse.json({
        totalGames: data.games.length,
        newGames: newGames.length,
        conflicts: conflicts.length,
        conflictGames: conflicts.map(g => ({
          title: g.title,
          bggId: g.bggId,
        })),
      });
    }

    // Perform restore
    const results = {
      imported: 0,
      skipped: 0,
      replaced: 0,
      errors: [] as string[],
    };

    for (const game of data.games) {
      try {
        const isDuplicate = existingBggIds.has(game.bggId) || 
                          existingTitles.has(game.title.toLowerCase());

        if (isDuplicate) {
          if (data.conflictResolution === 'skip') {
            results.skipped++;
            continue;
          } else if (data.conflictResolution === 'replace') {
            // Delete existing and create new
            await prisma.game.deleteMany({
              where: {
                userId: session.user.id,
                OR: [
                  { bggId: game.bggId },
                  { title: game.title },
                ],
              },
            });
            results.replaced++;
          }
          // For 'keepBoth', just continue to create
        }

        await prisma.game.create({
          data: {
            bggId: game.bggId,
            title: game.title,
            thumbnail: game.thumbnail,
            image: game.image,
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            minPlayTime: game.minPlayTime,
            maxPlayTime: game.maxPlayTime,
            yearPublished: game.yearPublished,
            description: game.description,
            mechanics: JSON.stringify(game.mechanics || []),
            categories: JSON.stringify(game.categories || []),
            designers: JSON.stringify(game.designers || []),
            publishers: JSON.stringify(game.publishers || []),
            artists: JSON.stringify(game.artists || []),
            minAge: game.minAge,
            complexity: game.complexity,
            bggRating: game.bggRating,
            bggRatingsCount: game.bggRatingsCount,
            bggRank: game.bggRank,
            userId: session.user.id,
          },
        });

        results.imported++;
      } catch (error) {
        console.error(`Failed to import ${game.title}:`, error);
        results.errors.push(game.title);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Restore collection error:', error);
    return NextResponse.json({ error: 'Failed to restore collection' }, { status: 500 });
  }
}