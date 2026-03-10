import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/settings/public - Get public site settings (no auth required)
// This endpoint is used by the registration page to check if invite-only mode is enabled
export async function GET() {
  try {
    let settings = await prisma.siteSettings.findFirst();
    
    // Return default settings if none exist
    if (!settings) {
      return NextResponse.json({
        allowRegistration: true,
        inviteOnlyMode: false,
      });
    }

    // Only return public-safe settings
    return NextResponse.json({
      allowRegistration: settings.allowRegistration,
      inviteOnlyMode: settings.inviteOnlyMode,
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    // Return defaults on error
    return NextResponse.json({
      allowRegistration: true,
      inviteOnlyMode: false,
    });
  }
}