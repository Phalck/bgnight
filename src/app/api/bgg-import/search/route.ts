import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface BGGSearchResult {
  id: string;
  title: string;
  yearPublished?: number;
  thumbnail?: string;
}

interface BGGSearchResponse {
  success: boolean;
  data?: BGGSearchResult[];
  hasMore?: boolean;
  total?: number;
  error?: string;
}

// Configure XML parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
});

// Fetch thumbnail for a game (BGG search doesn't return thumbnails, so we fetch them separately)
async function fetchThumbnails(gameIds: string[]): Promise<Record<string, string>> {
  if (gameIds.length === 0) return {};
  
  try {
    // Wait 2 seconds to respect BGG rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const idsParam = gameIds.join(',');
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${idsParam}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BoardGameNight-App/1.0',
      },
    });
    
    if (!response.ok) return {};
    
    const xml = await response.text();
    const parsed = parser.parse(xml);
    
    const thumbnails: Record<string, string> = {};
    
    if (parsed.items && parsed.items.item) {
      const items = Array.isArray(parsed.items.item) 
        ? parsed.items.item 
        : [parsed.items.item];
      
      items.forEach((item: any) => {
        const id = item['@_id'];
        const thumbnail = item.thumbnail;
        if (id && thumbnail) {
          thumbnails[id] = thumbnail;
        }
      });
    }
    
    return thumbnails;
  } catch (error) {
    console.error('Error fetching thumbnails:', error);
    return {};
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    if (!gameName) {
      return NextResponse.json({
        success: false,
        error: 'Game name is required',
      }, { status: 400 });
    }
    
    // BGG Search API
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'BoardGameNight-App/1.0',
      },
    });
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`BGG search failed: ${searchResponse.status} - ${errorText.substring(0, 200)}`);
    }
    
    const searchXml = await searchResponse.text();
    const searchParsed = parser.parse(searchXml);
    
    if (!searchParsed.items || !searchParsed.items.item) {
      return NextResponse.json({
        success: true,
        data: [],
        hasMore: false,
        total: 0,
      });
    }
    
    const allItems = Array.isArray(searchParsed.items.item) 
      ? searchParsed.items.item 
      : [searchParsed.items.item];
    
    if (allItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        hasMore: false,
        total: 0,
      });
    }
    
    // Get the 3 results for this page
    const pageSize = 3;
    const pageItems = allItems.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < allItems.length;
    
    // Parse basic info from search results
    const results: BGGSearchResult[] = pageItems.map((item: any) => {
      const id = item['@_id'];
      
      // Get primary name
      let title = '';
      if (item.name) {
        const names = Array.isArray(item.name) ? item.name : [item.name];
        const primaryName = names.find((n: any) => n['@_type'] === 'primary');
        title = primaryName?.['@_value'] || names[0]?.['@_value'] || '';
      }
      
      const yearPublished = parseInt(item.yearpublished?.['@_value'], 10) || undefined;
      
      return {
        id,
        title,
        yearPublished,
      };
    }).filter((r: BGGSearchResult) => r.title); // Filter out entries without titles
    
    // Fetch thumbnails for these games
    const gameIds = results.map(r => r.id);
    const thumbnails = await fetchThumbnails(gameIds);
    
    // Add thumbnails to results
    const resultsWithThumbnails = results.map(r => ({
      ...r,
      thumbnail: thumbnails[r.id],
    }));
    
    return NextResponse.json({
      success: true,
      data: resultsWithThumbnails,
      hasMore,
      total: allItems.length,
    });
    
  } catch (error: any) {
    console.error('BGG search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search BoardGameGeek',
      details: error.message,
    }, { status: 500 });
  }
}
