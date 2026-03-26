import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const isAdmin = session.user.role === 'ADMIN';

    // Build where clause
    const where: any = {
      isActive: true,
      id: {
        not: session.user.id, // Exclude current user (prevent self-linking)
      },
    };

    // Only filter by allowPlayerLinking if not admin
    if (!isAdmin) {
      where.allowPlayerLinking = true;
    }

    // Add name search if query provided
    if (query) {
      where.name = {
        contains: query,
        mode: 'insensitive',
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: isAdmin ? true : undefined, // Admin always sees email
        showEmailInSearch: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 20, // Limit results
    });

    // Filter out email for non-admin users unless showEmailInSearch is true
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: isAdmin || user.showEmailInSearch ? user.email : null,
    }));

    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
