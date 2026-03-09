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

    const plays = await prisma.playLog.findMany({
      where: { userId: session.user.id },
      include: {
        game: {
          select: {
            id: true,
            title: true,
            bggId: true,
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
      orderBy: { playedAt: 'desc' },
    });

    const backupData = {
      exportDate: new Date().toISOString(),
      exportType: 'plays',
      version: '1.0',
      user: session.user.email,
      playCount: plays.length,
      plays: plays.map(play => ({
        id: play.id,
        game: {
          id: play.game.id,
          title: play.game.title,
          bggId: play.game.bggId,
        },
        playedAt: play.playedAt.toISOString(),
        players: play.players.map(p => ({ id: p.id, name: p.name })),
        winners: play.winners.map(w => ({ id: w.id, name: w.name })),
        duration: play.duration,
        location: play.location,
        rating: play.rating,
        notes: play.notes,
      })),
    };

    return NextResponse.json(backupData);
  } catch (error) {
    console.error('Backup plays error:', error);
    return NextResponse.json({ error: 'Failed to backup plays' }, { status: 500 });
  }
}