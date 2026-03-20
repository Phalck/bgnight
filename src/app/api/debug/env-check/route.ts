import { NextResponse } from 'next/server';
import { getGameById } from '@/lib/bgg';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    message: 'Environment variable debug check',
    note: 'TODO: Remove this endpoint after debugging is complete',
    directAccess: {
      tokenExists: !!process.env.BGG_API_TOKEN,
      tokenLength: process.env.BGG_API_TOKEN?.length || 0,
      tokenFirstChars: process.env.BGG_API_TOKEN ? process.env.BGG_API_TOKEN.substring(0, 10) + '...' : 'N/A',
      tokenLastChars: process.env.BGG_API_TOKEN ? '...' + process.env.BGG_API_TOKEN.slice(-5) : 'N/A',
    },
    libraryTest: await testLibraryAccess(),
  };
  
  // Log for server-side visibility
  console.log('[Debug Env Check] Results:', JSON.stringify(results, null, 2));
  
  return NextResponse.json(results);
}

async function testLibraryAccess() {
  try {
    // Try to fetch a known game to see if auth works
    console.log('[Debug Env Check] Testing library access with game ID 483...');
    const game = await getGameById(483); // Diplomacy
    
    const result = {
      success: !!game,
      gameFound: game ? game.name : null,
      gameId: game ? game.id : null,
      error: null,
    };
    
    console.log('[Debug Env Check] Library test result:', result);
    return result;
  } catch (error) {
    const errorResult = {
      success: false,
      gameFound: null,
      gameId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    };
    
    console.error('[Debug Env Check] Library test failed:', errorResult);
    return errorResult;
  }
}