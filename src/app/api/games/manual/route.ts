import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[Manual API] Request body:', {
      title: body.title,
      complexity: body.complexity,
      bggRating: body.bggRating
    });

    const {
      title,
      thumbnail,
      minPlayers,
      maxPlayers,
      minPlayTime,
      maxPlayTime,
      yearPublished,
      description,
      mechanics,
      categories,
      designers,
      publishers,
      complexity,
      bggRating,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    console.log('[Manual API] Extracted values:', { complexity, bggRating });

    const game = await prisma.game.create({
      data: {
        bggId: Math.floor(Math.random() * 1000000),
        title,
        thumbnail: thumbnail || null,
        image: null,
        minPlayers: minPlayers || 2,
        maxPlayers: maxPlayers || 4,
        minPlayTime: minPlayTime || null,
        maxPlayTime: maxPlayTime || null,
        yearPublished: yearPublished || null,
        description: description || null,
        mechanics: JSON.stringify(mechanics ? mechanics.split(',').map((m: string) => m.trim()).filter(Boolean) : []),
        categories: JSON.stringify(categories ? categories.split(',').map((c: string) => c.trim()).filter(Boolean) : []),
        designers: JSON.stringify(designers ? designers.split(',').map((d: string) => d.trim()).filter(Boolean) : []),
        publishers: JSON.stringify(publishers ? publishers.split(',').map((p: string) => p.trim()).filter(Boolean) : []),
        complexity: complexity || null,
        bggRating: bggRating || null,
        userId: session.user.id,
      },
    });

    console.log('[Manual API] Saved game to database:', {
      id: game.id,
      title: game.title,
      complexity: game.complexity,
      bggRating: game.bggRating
    });

    return NextResponse.json({
      ...game,
      mechanics: JSON.parse(game.mechanics || '[]'),
      categories: JSON.parse(game.categories || '[]'),
      designers: JSON.parse(game.designers || '[]'),
      publishers: JSON.parse(game.publishers || '[]'),
    });
  } catch (error) {
    console.error('Add game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
