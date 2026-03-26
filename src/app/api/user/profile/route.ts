import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        allowPlayerLinking: true,
        showEmailInSearch: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { allowPlayerLinking, showEmailInSearch } = body;

    // Validate input types
    if (allowPlayerLinking !== undefined && typeof allowPlayerLinking !== 'boolean') {
      return NextResponse.json(
        { error: 'allowPlayerLinking must be a boolean' },
        { status: 400 }
      );
    }

    if (showEmailInSearch !== undefined && typeof showEmailInSearch !== 'boolean') {
      return NextResponse.json(
        { error: 'showEmailInSearch must be a boolean' },
        { status: 400 }
      );
    }

    const updateData: { allowPlayerLinking?: boolean; showEmailInSearch?: boolean } = {};
    if (allowPlayerLinking !== undefined) updateData.allowPlayerLinking = allowPlayerLinking;
    if (showEmailInSearch !== undefined) updateData.showEmailInSearch = showEmailInSearch;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        allowPlayerLinking: true,
        showEmailInSearch: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
