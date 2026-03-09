import { NextResponse } from 'next/server';

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

// Parse XML text to extract data
function parseXML(xml: string): BGGGameData | null {
  try {
    // Helper to extract text between tags
    const getText = (tag: string): string => {
      const match = xml.match(new RegExp(`<${tag}>([^<]+)<\\/${tag}>`));
      return match ? match[1] : '';
    };

    // Helper to get attribute value
    const getAttr = (tag: string, attr: string): string => {
      const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`));
      return match ? match[1] : '';
    };

    // Helper to get all link values of a specific type
    const getLinks = (type: string): string[] => {
      const matches = xml.match(new RegExp(`<link type="${type}"[^>]*value="([^"]+)"`, 'g'));
      return matches ? matches.map(m => {
        const valMatch = m.match(/value="([^"]+)"/);
        return valMatch ? valMatch[1] : '';
      }).filter(Boolean) : [];
    };

    const title = getText('name');
    if (!title) return null;

    const description = getText('description')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#10;/g, '\n');

    return {
      title,
      description,
      yearPublished: parseInt(getAttr('yearpublished', 'value')) || 0,
      minPlayers: parseInt(getAttr('minplayers', 'value')) || 1,
      maxPlayers: parseInt(getAttr('maxplayers', 'value')) || 1,
      minPlayTime: parseInt(getAttr('minplaytime', 'value')) || 0,
      maxPlayTime: parseInt(getAttr('maxplaytime', 'value')) || 0,
      minAge: parseInt(getAttr('minage', 'value')) || 0,
      complexity: parseFloat(getText('averageweight')) || 0,
      bggRating: parseFloat(getText('average')) || 0,
      bggRatingsCount: parseInt(getText('usersrated')) || 0,
      bggRank: parseInt(getAttr('rank', 'value')) || 0,
      thumbnail: getText('thumbnail'),
      image: getText('image'),
      categories: getLinks('boardgamecategory'),
      mechanics: getLinks('boardgamemechanic'),
      designers: getLinks('boardgamedesigner'),
      publishers: getLinks('boardgamepublisher'),
      artists: getLinks('boardgameartist'),
    };
  } catch (error) {
    console.error('XML parsing error:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');

    if (!gameName) {
      return NextResponse.json({
        success: false,
        error: 'Game name is required',
      }, { status: 400 });
    }

    // Check if BGG token is configured
    const bggToken = process.env.BGG_API_TOKEN;

    if (!bggToken) {
      return NextResponse.json({
        success: false,
        comingSoon: true,
        message: 'BGG integration coming soon! Please add your BGG API token to enable automatic game data import.',
      });
    }

    // Step 1: Search for game on BGG
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${bggToken}`,
        'User-Agent': 'BoardGameNight-App/1.0',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`BGG search failed: ${searchResponse.status}`);
    }

    const searchXml = await searchResponse.text();
    
    // Extract first game ID
    const idMatch = searchXml.match(/id="(\d+)"/);
    if (!idMatch) {
      return NextResponse.json({
        success: false,
        notFound: true,
        message: `Game "${gameName}" not found on BoardGameGeek.`,
      });
    }

    const gameId = idMatch[1];

    // Step 2: Get detailed game info
    // Wait 1 second to respect BGG rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
    
    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'Authorization': `Bearer ${bggToken}`,
        'User-Agent': 'BoardGameNight-App/1.0',
      },
    });

    if (!detailsResponse.ok) {
      throw new Error(`BGG details fetch failed: ${detailsResponse.status}`);
    }

    const detailsXml = await detailsResponse.text();
    const gameData = parseXML(detailsXml);

    if (!gameData) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse game data from BGG',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: gameData,
    });

  } catch (error: any) {
    console.error('BGG import error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch from BoardGameGeek',
      details: error.message,
    }, { status: 500 });
  }
}