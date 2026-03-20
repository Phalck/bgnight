import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clearManualEditTracking } from '@/lib/manual-edit-tracker';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await request.json();
    
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    await clearManualEditTracking(gameId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing manual edit tracking:', error);
    return NextResponse.json(
      { error: 'Failed to clear manual edit tracking' },
      { status: 500 }
    );
  }
}