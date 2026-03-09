import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expires: Date }>();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with 30-minute expiration
    verificationCodes.set(session.user.id, {
      code,
      expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    // In production, send email here
    // For now, return code in response for testing
    console.log(`Verification code for ${user.email}: ${code}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your email',
      // Only in development - remove in production
      devCode: process.env.NODE_ENV === 'development' ? code : undefined,
    });
  } catch (error) {
    console.error('Delete request error:', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}

// Verify code and delete account
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Verification code required' }, { status: 400 });
    }

    // Verify code
    const stored = verificationCodes.get(session.user.id);
    
    if (!stored) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    if (new Date() > stored.expires) {
      verificationCodes.delete(session.user.id);
      return NextResponse.json({ error: 'Verification code expired. Please request a new one.' }, { status: 400 });
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Delete user and all associated data (cascade will handle relations)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    // Clear verification code
    verificationCodes.delete(session.user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}