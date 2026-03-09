import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/planned-nights/[id] - Get single planned night
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    const plannedNight = await prisma.plannedGameNight.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        games: {
          include: {
            game: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                minPlayers: true,
                maxPlayers: true,
                maxPlayTime: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        players: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!plannedNight) {
      return NextResponse.json({ error: 'Planned night not found' }, { status: 404 });
    }
    
    return NextResponse.json(plannedNight);
  } catch (error) {
    console.error('Failed to fetch planned night:', error);
    return NextResponse.json({ error: 'Failed to fetch planned night' }, { status: 500 });
  }
}

// DELETE /api/planned-nights/[id] - Delete planned night
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  try {
    // Verify the planned night belongs to the user
    const plannedNight = await prisma.plannedGameNight.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });
    
    if (!plannedNight) {
      return NextResponse.json({ error: 'Planned night not found' }, { status: 404 });
    }
    
    await prisma.plannedGameNight.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete planned night:', error);
    return NextResponse.json({ error: 'Failed to delete planned night' }, { status: 500 });
  }
}
