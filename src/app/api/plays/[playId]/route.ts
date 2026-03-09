import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/plays/[playId] - Delete a play log
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ playId: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { playId } = await params;
  
  try {
    // Verify the play log belongs to the user
    const playLog = await prisma.playLog.findFirst({
      where: {
        id: playId,
        userId: session.user.id,
      },
    });
    
    if (!playLog) {
      return NextResponse.json({ error: 'Play log not found' }, { status: 404 });
    }
    
    await prisma.playLog.delete({
      where: { id: playId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete play log:', error);
    return NextResponse.json({ error: 'Failed to delete play log' }, { status: 500 });
  }
}
