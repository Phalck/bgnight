import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get count before deletion
    const count = await prisma.playLog.count({
      where: { userId: session.user.id },
    });

    // Delete all play logs
    await prisma.playLog.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ 
      success: true, 
      deleted: count,
      message: `Deleted ${count} logged plays` 
    });
  } catch (error) {
    console.error('Delete plays error:', error);
    return NextResponse.json({ error: 'Failed to delete logged plays' }, { status: 500 });
  }
}