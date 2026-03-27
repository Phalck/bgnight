import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/players/self - Get current user's self-player
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const selfPlayer = await prisma.player.findFirst({
      where: {
        userId: session.user.id,
        isSelfPlayer: true,
      },
      include: {
        _count: {
          select: {
            playLogs: true,
            wins: true,
          },
        },
        linkedUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    if (!selfPlayer) {
      return NextResponse.json({ error: 'Self-player not found' }, { status: 404 });
    }
    
    return NextResponse.json(selfPlayer);
  } catch (error) {
    console.error('Failed to fetch self-player:', error);
    return NextResponse.json({ error: 'Failed to fetch self-player' }, { status: 500 });
  }
}
