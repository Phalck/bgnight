import { NextResponse } from 'next/server';
import { fetchBGGGameById, BGGGameData } from '@/lib/bgg-import-client';
import { XMLParser } from 'fast-xml-parser';

// Configure XML parser for search results
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
});

export async function GET(request: Request) {
  const logs: string[] = [];
  
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const gameId = searchParams.get('gameId');

    if (!gameName && !gameId) {
      return NextResponse.json({
        success: false,
        error: 'Game name or game ID is required',
      }, { status: 400 });
    }

    // Get BGG token from environment
    const bggToken = process.env.BGG_API_TOKEN;
    logs.push(`BGG Token configured: ${bggToken ? 'Yes' : 'No'}`);

    let finalGameId = gameId;
    
    // Step 1: Search for game on BGG (if gameId not provided)
    if (!finalGameId && gameName) {
      const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
      logs.push(`Search URL: ${searchUrl}`);
      
      const searchHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://boardgamegeek.com/',
      };
      
      const searchResponse = await fetch(searchUrl, { headers: searchHeaders });
      logs.push(`Search response status: ${searchResponse.status}`);

      if (!searchResponse.ok) {
        const searchErrorText = await searchResponse.text();
        logs.push(`Search error response: ${searchErrorText.substring(0, 500)}`);
        throw new Error(`BGG search failed: ${searchResponse.status} - ${searchErrorText.substring(0, 200)}`);
      }

      const searchXml = await searchResponse.text();
      logs.push(`Search XML length: ${searchXml.length} chars`);
      logs.push(`Search XML preview: ${searchXml.substring(0, 300)}...`);
      
      // Parse search results to get game ID
      const searchParsed = parser.parse(searchXml);
      
      if (!searchParsed.items || !searchParsed.items.item) {
        logs.push('No items found in search results');
        return NextResponse.json({
          success: false,
          notFound: true,
          message: `Game "${gameName}" not found on BoardGameGeek.`,
          logs,
        });
      }

      const items = Array.isArray(searchParsed.items.item) 
        ? searchParsed.items.item 
        : [searchParsed.items.item];
      
      if (items.length === 0) {
        logs.push('Items array is empty');
        return NextResponse.json({
          success: false,
          notFound: true,
          message: `Game "${gameName}" not found on BoardGameGeek.`,
          logs,
        });
      }

      finalGameId = items[0]['@_id'];
    }
    
    if (!finalGameId) {
      return NextResponse.json({
        success: false,
        error: 'No game ID found',
        logs,
      }, { status: 400 });
    }

    logs.push(`Found game ID: ${finalGameId}`);

    // Step 2: Get detailed game info using shared library
    logs.push('Fetching game details via shared library...');
    const gameData = await fetchBGGGameById(parseInt(finalGameId, 10));
    
    if (!gameData) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch game data from BGG',
        logs,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: gameData,
      logs,
    });

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error('BGG import error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch from BoardGameGeek',
      details: errorMessage,
      logs,
    }, { status: 500 });
  }
}