import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const game = await prisma.game.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const updated = await prisma.game.update({
      where: { id },
      data: {
        title: data.title ?? game.title,
        thumbnail: data.thumbnail ?? game.thumbnail,
        minPlayers: data.minPlayers ?? game.minPlayers,
        maxPlayers: data.maxPlayers ?? game.maxPlayers,
        minPlayTime: data.minPlayTime ?? game.minPlayTime,
        maxPlayTime: data.maxPlayTime ?? game.maxPlayTime,
        yearPublished: data.yearPublished ?? game.yearPublished,
        mechanics: data.mechanics ? JSON.stringify(data.mechanics) : game.mechanics,
        categories: data.categories ? JSON.stringify(data.categories) : game.categories,
        designers: data.designers ? JSON.stringify(data.designers) : game.designers,
        publishers: data.publishers ? JSON.stringify(data.publishers) : game.publishers,
        complexity: data.complexity ?? game.complexity,
        bggRating: data.bggRating ?? game.bggRating,
      },
    });

    return NextResponse.json({
      ...updated,
      mechanics: JSON.parse(updated.mechanics || '[]'),
      categories: JSON.parse(updated.categories || '[]'),
      designers: JSON.parse(updated.designers || '[]'),
      publishers: JSON.parse(updated.publishers || '[]'),
    });
  } catch (error) {
    console.error('Update game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if game exists and belongs to user
    const game = await prisma.game.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Delete the game
    await prisma.game.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}