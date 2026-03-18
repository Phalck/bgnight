import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface BGGGameData {
  title: string;
  description: string;
  yearPublished: number;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  minAge: number;
  complexity: number;
  bggRating: number;
  bggRatingsCount: number;
  bggRank: number;
  thumbnail: string;
  image: string;
  categories: string[];
  mechanics: string[];
  designers: string[];
  publishers: string[];
  artists: string[];
}

// Configure XML parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
});

// Transform BGG image URL to get high-resolution version
function getHighResImageUrl(url: string | undefined): string {
  if (!url) return '';
  // Replace /med/ with /original/ to get full resolution image
  return url.replace('/med/', '/original/');
}

// Parse XML to extract game data
function parseXML(xml: string): { gameData: BGGGameData | null; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const parsed = parser.parse(xml);
    
    if (!parsed.items || !parsed.items.item) {
      errors.push('No items found in XML response');
      return { gameData: null, errors };
    }

    // Handle single item or array of items
    const item = Array.isArray(parsed.items.item) ? parsed.items.item[0] : parsed.items.item;
    
    if (!item) {
      errors.push('Could not extract item from parsed XML');
      return { gameData: null, errors };
    }

    // Get primary name
    let title = '';
    if (item.name) {
      const names = Array.isArray(item.name) ? item.name : [item.name];
      const primaryName = names.find((n: any) => n['@_type'] === 'primary');
      title = primaryName?.['@_value'] || names[0]?.['@_value'] || '';
    }
    
    if (!title) {
      errors.push('No title found in game data');
    }

    // Get rank from ratings/ranks/rank
    let bggRank = 0;
    if (item.statistics?.ratings?.ranks?.rank) {
      const ranks = Array.isArray(item.statistics.ratings.ranks.rank) 
        ? item.statistics.ratings.ranks.rank 
        : [item.statistics.ratings.ranks.rank];
      const boardgameRank = ranks.find((r: any) => r['@_name'] === 'boardgame');
      if (boardgameRank && boardgameRank['@_value'] !== 'Not Ranked') {
        bggRank = parseInt(boardgameRank['@_value'], 10) || 0;
      }
    }

    // Get links (categories, mechanics, designers, etc.)
    const getLinks = (type: string): string[] => {
      if (!item.link) return [];
      const links = Array.isArray(item.link) ? item.link : [item.link];
      return links
        .filter((l: any) => l['@_type'] === type)
        .map((l: any) => l['@_value'])
        .filter(Boolean);
    };

    // Decode HTML entities in description
    const decodeHtml = (text: string): string => {
      if (!text) return '';
      return text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#10;/g, '\n')
        .replace(/&#13;/g, '')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    };

    const gameData: BGGGameData = {
      title,
      description: decodeHtml(item.description),
      yearPublished: parseInt(item.yearpublished?.['@_value'], 10) || 0,
      minPlayers: parseInt(item.minplayers?.['@_value'], 10) || 1,
      maxPlayers: parseInt(item.maxplayers?.['@_value'], 10) || 1,
      minPlayTime: parseInt(item.minplaytime?.['@_value'], 10) || 0,
      maxPlayTime: parseInt(item.maxplaytime?.['@_value'], 10) || 0,
      minAge: parseInt(item.minage?.['@_value'], 10) || 0,
      complexity: parseFloat(item.statistics?.ratings?.averageweight?.['@_value']) || 0,
      bggRating: parseFloat(item.statistics?.ratings?.average?.['@_value']) || 0,
      bggRatingsCount: parseInt(item.statistics?.ratings?.usersrated?.['@_value'], 10) || 0,
      bggRank,
      thumbnail: item.thumbnail || '',
      image: getHighResImageUrl(item.image),
      categories: getLinks('boardgamecategory'),
      mechanics: getLinks('boardgamemechanic'),
      designers: getLinks('boardgamedesigner'),
      publishers: getLinks('boardgamepublisher'),
      artists: getLinks('boardgameartist'),
    };

    return { gameData, errors };
  } catch (error: any) {
    errors.push(`XML parsing error: ${error.message}`);
    return { gameData: null, errors };
  }
}

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
        'User-Agent': 'BoardGameNight-App/1.0',
      };
      
      if (bggToken) {
        searchHeaders['Authorization'] = `Bearer ${bggToken}`;
      }
      
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
          message: `Game "${gameName}" not found on Board game geek.`,
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
          message: `Game "${gameName}" not found on Board game geek.`,
          logs,
        });
      }

      finalGameId = items[0]['@_id'];
    }
    
    logs.push(`Found game ID: ${finalGameId}`);

    // Step 2: Get detailed game info
    // Wait 5 seconds to respect BGG rate limits
    logs.push('Waiting 5 seconds for rate limit...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${finalGameId}&stats=1`;
    logs.push(`Details URL: ${detailsUrl}`);
    
    const detailsHeaders: Record<string, string> = {
      'User-Agent': 'BoardGameNight-App/1.0',
    };
    
    if (bggToken) {
      detailsHeaders['Authorization'] = `Bearer ${bggToken}`;
    }
    
    const detailsResponse = await fetch(detailsUrl, { headers: detailsHeaders });
    logs.push(`Details response status: ${detailsResponse.status}`);

    if (!detailsResponse.ok) {
      const detailsErrorText = await detailsResponse.text();
      logs.push(`Details error response: ${detailsErrorText.substring(0, 500)}`);
      throw new Error(`BGG details fetch failed: ${detailsResponse.status} - ${detailsErrorText.substring(0, 200)}`);
    }

    const detailsXml = await detailsResponse.text();
    logs.push(`Details XML length: ${detailsXml.length} chars`);
    logs.push(`Details XML preview: ${detailsXml.substring(0, 300)}...`);
    
    const { gameData, errors } = parseXML(detailsXml);
    
    if (errors.length > 0) {
      logs.push(...errors.map(e => `Parse error: ${e}`));
    }

    if (!gameData) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse game data from BGG',
        logs,
        rawXml: detailsXml.substring(0, 2000), // Include first 2000 chars of XML for debugging
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
      error: 'Failed to fetch from Board game geek',
      details: errorMessage,
      logs,
    }, { status: 500 });
  }
}