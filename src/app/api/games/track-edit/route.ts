import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { trackManualEdit } from '@/lib/manual-edit-tracker';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId, fields } = await request.json();
    
    if (!gameId || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Track each field that was edited
    for (const field of fields) {
      await trackManualEdit(gameId, session.user.id, field);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking manual edit:', error);
    return NextResponse.json(
      { error: 'Failed to track manual edit' },
      { status: 500 }
    );
  }
}