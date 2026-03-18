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

// Parse XML text to extract data using DOM parsing
function parseXML(xml: string): BGGGameData | null {
  try {
    // Use DOMParser for proper XML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    // Get the first item element
    const item = doc.querySelector('item');
    if (!item) {
      console.error('No item element found in XML');
      return null;
    }

    // Get primary name (type="primary")
    const nameEl = item.querySelector('name[type="primary"]');
    const title = nameEl?.getAttribute('value') || '';
    if (!title) {
      console.error('No title found in XML');
      return null;
    }

    // Helper to get attribute value from element
    const getAttr = (selector: string, attr: string): string => {
      const el = item.querySelector(selector);
      return el?.getAttribute(attr) || '';
    };

    // Helper to get text content
    const getText = (selector: string): string => {
      const el = item.querySelector(selector);
      return el?.textContent || '';
    };

    // Helper to get all link values of a specific type
    const getLinks = (type: string): string[] => {
      const links = item.querySelectorAll(`link[type="${type}"]`);
      const values: string[] = [];
      links.forEach(link => {
        const value = link.getAttribute('value');
        if (value) values.push(value);
      });
      return values;
    };

    // Get rank from ratings/ranks/rank element with name="boardgame"
    let bggRank = 0;
    const rankEl = item.querySelector('rank[name="boardgame"]');
    if (rankEl) {
      const rankValue = rankEl.getAttribute('value');
      if (rankValue && rankValue !== 'Not Ranked') {
        bggRank = parseInt(rankValue, 10) || 0;
      }
    }

    const description = getText('description')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#10;/g, '\n')
      .replace(/&#13;/g, '')
      .replace(/&nbsp;/g, ' ');

    return {
      title,
      description,
      yearPublished: parseInt(getAttr('yearpublished', 'value'), 10) || 0,
      minPlayers: parseInt(getAttr('minplayers', 'value'), 10) || 1,
      maxPlayers: parseInt(getAttr('maxplayers', 'value'), 10) || 1,
      minPlayTime: parseInt(getAttr('minplaytime', 'value'), 10) || 0,
      maxPlayTime: parseInt(getAttr('maxplaytime', 'value'), 10) || 0,
      minAge: parseInt(getAttr('minage', 'value'), 10) || 0,
      complexity: parseFloat(getText('averageweight')) || 0,
      bggRating: parseFloat(getText('average')) || 0,
      bggRatingsCount: parseInt(getText('usersrated'), 10) || 0,
      bggRank,
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

    // Check if BGG token is configured (optional for now)
    // const bggToken = process.env.BGG_API_TOKEN;
    // Note: Authorization header not currently used but kept for future use

    // Step 1: Search for game on BGG
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
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
    // Wait 2 seconds to respect BGG rate limits (5 seconds is recommended between requests)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
    
    const detailsResponse = await fetch(detailsUrl, {
      headers: {
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