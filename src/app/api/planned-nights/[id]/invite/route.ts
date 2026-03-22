import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

// POST /api/planned-nights/[id]/invite - Generate invite link
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { expirationHours } = body;

    // Validate expiration hours
    const validExpirations = [4, 8, 24, 48];
    if (!validExpirations.includes(expirationHours)) {
      return NextResponse.json(
        { error: 'Invalid expiration time. Must be 4, 8, 24, or 48 hours' },
        { status: 400 }
      );
    }

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

    // Generate unique token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Update the planned night with invite details
    const updatedNight = await prisma.plannedGameNight.update({
      where: { id },
      data: {
        inviteToken: token,
        inviteExpiresAt: expiresAt,
        inviteEnabled: true,
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

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/invite/${token}`;

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      url: inviteUrl,
      plannedNight: updatedNight,
    });
  } catch (error) {
    console.error('Failed to generate invite link:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite link' },
      { status: 500 }
    );
  }
}

// PATCH /api/planned-nights/[id]/invite - Regenerate invite link
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { expirationHours } = body;

    // Validate expiration hours
    const validExpirations = [4, 8, 24, 48];
    if (!validExpirations.includes(expirationHours)) {
      return NextResponse.json(
        { error: 'Invalid expiration time. Must be 4, 8, 24, or 48 hours' },
        { status: 400 }
      );
    }

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

    // Generate new token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Update with new token
    const updatedNight = await prisma.plannedGameNight.update({
      where: { id },
      data: {
        inviteToken: token,
        inviteExpiresAt: expiresAt,
        inviteEnabled: true,
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

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/invite/${token}`;

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      url: inviteUrl,
      plannedNight: updatedNight,
    });
  } catch (error) {
    console.error('Failed to regenerate invite link:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate invite link' },
      { status: 500 }
    );
  }
}

// DELETE /api/planned-nights/[id]/invite - Disable invite link
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

    // Disable the invite
    await prisma.plannedGameNight.update({
      where: { id },
      data: {
        inviteEnabled: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to disable invite link:', error);
    return NextResponse.json(
      { error: 'Failed to disable invite link' },
      { status: 500 }
    );
  }
}