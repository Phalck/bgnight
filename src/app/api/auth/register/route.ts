import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { name, email, password, inviteCode } = await request.json();

    // Check site settings
    const settings = await prisma.siteSettings.findFirst();

    // If no settings exist or registration is disabled
    if (!settings?.allowRegistration) {
      return NextResponse.json(
        { error: 'Registration is currently disabled' },
        { status: 403 }
      );
    }

    // Check if invite-only mode is enabled
    if (settings?.inviteOnlyMode) {
      if (!inviteCode) {
        return NextResponse.json(
          { error: 'Invite code is required' },
          { status: 400 }
        );
      }

      // Validate invite code
      const validCode = await prisma.inviteCode.findFirst({
        where: {
          code: inviteCode.toUpperCase(),
          isActive: true,
          usedBy: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (!validCode) {
        return NextResponse.json(
          { error: 'Invalid or expired invite code' },
          { status: 400 }
        );
      }
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Check if this is the first user - make them admin
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: isFirstUser ? 'ADMIN' : 'USER',
      },
    });

    // Create self-player for the new user
    const emailPrefix = email.split('@')[0];
    await prisma.player.create({
      data: {
        name: emailPrefix,
        userId: user.id,
        linkedUserId: user.id,
        isSelfPlayer: true,
      },
    });

    // If invite code was used, mark it as used
    if (settings?.inviteOnlyMode && inviteCode) {
      await prisma.inviteCode.updateMany({
        where: {
          code: inviteCode.toUpperCase(),
          usedBy: null,
        },
        data: {
          usedBy: user.id,
          usedAt: new Date(),
          isActive: false,
        },
      });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
