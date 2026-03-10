import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Generate random 8-character invite code
function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET /api/admin/invite-codes - List all invite codes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const showUsed = searchParams.get('showUsed') === 'true';

    const where: any = {};
    if (!showUsed) {
      where.usedBy = null;
    }

    const codes = await prisma.inviteCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Error fetching invite codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite codes' },
      { status: 500 }
    );
  }
}

// POST /api/admin/invite-codes - Generate new invite code(s)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { count = 1, expiresAt } = body;

    const codes = [];
    
    for (let i = 0; i < count; i++) {
      let code = generateInviteCode();
      let attempts = 0;
      
      // Ensure code is unique
      while (attempts < 10) {
        const existing = await prisma.inviteCode.findUnique({
          where: { code },
        });
        
        if (!existing) break;
        
        code = generateInviteCode();
        attempts++;
      }

      const inviteCode = await prisma.inviteCode.create({
        data: {
          code,
          createdBy: session.user.id,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
      
      codes.push(inviteCode);
    }

    return NextResponse.json({ 
      codes,
      message: `${codes.length} invite code(s) generated successfully` 
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating invite codes:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite codes' },
      { status: 500 }
    );
  }
}