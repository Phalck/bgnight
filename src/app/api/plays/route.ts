import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/plays - Get all play logs for the user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const plays = await prisma.playLog.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        game: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
        players: {
          select: {
            id: true,
            name: true,
          },
        },
        winners: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        playedAt: 'desc',
      },
    });
    
    return NextResponse.json(plays);
  } catch (error) {
    console.error('Failed to fetch plays:', error);
    return NextResponse.json({ error: 'Failed to fetch plays' }, { status: 500 });
  }
}
