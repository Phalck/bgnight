import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface BGGSearchResult {
  id: string;
  title: string;
  yearPublished?: number;
}

interface BGGSearchResponse {
  success: boolean;
  data?: BGGSearchResult[];
  hasMore?: boolean;
  total?: number;
  error?: string;
  logs?: string[];
}

// Configure XML parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
});

// Fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BoardGameNight-App/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET(request: Request) {
  const logs: string[] = [];
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    logs.push(`[BGG Search] Starting search for: "${gameName}"`);
    logs.push(`[BGG Search] Offset: ${offset}`);
    
    if (!gameName) {
      logs.push('[BGG Search] Error: Game name is required');
      return NextResponse.json({
        success: false,
        error: 'Game name is required',
        logs,
      }, { status: 400 });
    }
    
    // BGG Search API
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
    logs.push(`[BGG Search] Request URL: ${searchUrl}`);
    logs.push(`[BGG Search] Timeout: 10s`);
    
    let searchResponse;
    try {
      searchResponse = await fetchWithTimeout(searchUrl, 10000);
      logs.push(`[BGG Search] Response received: ${searchResponse.status} ${searchResponse.statusText}`);
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        logs.push('[BGG Search] Error: Request timed out after 10s');
        throw new Error('Request timed out after 10 seconds');
      }
      logs.push(`[BGG Search] Error: Fetch failed - ${fetchError.message}`);
      throw fetchError;
    }
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      logs.push(`[BGG Search] Error: HTTP ${searchResponse.status} - ${errorText.substring(0, 200)}`);
      throw new Error(`BGG search failed: ${searchResponse.status}`);
    }
    
    const searchXml = await searchResponse.text();
    logs.push(`[BGG Search] XML received: ${searchXml.length} characters`);
    logs.push(`[BGG Search] XML preview: ${searchXml.substring(0, 300)}...`);
    
    let searchParsed;
    try {
      searchParsed = parser.parse(searchXml);
      logs.push('[BGG Search] XML parsed successfully');
    } catch (parseError: any) {
      logs.push(`[BGG Search] Error: XML parsing failed - ${parseError.message}`);
      throw parseError;
    }
    
    if (!searchParsed.items || !searchParsed.items.item) {
      logs.push('[BGG Search] No items found in search results');
      const duration = Date.now() - startTime;
      logs.push(`[BGG Search] Total time: ${duration}ms`);
      
      return NextResponse.json({
        success: true,
        data: [],
        hasMore: false,
        total: 0,
        logs,
      });
    }
    
    const allItems = Array.isArray(searchParsed.items.item) 
      ? searchParsed.items.item 
      : [searchParsed.items.item];
    
    logs.push(`[BGG Search] Found ${allItems.length} total items`);
    
    if (allItems.length === 0) {
      const duration = Date.now() - startTime;
      logs.push(`[BGG Search] Total time: ${duration}ms`);
      
      return NextResponse.json({
        success: true,
        data: [],
        hasMore: false,
        total: 0,
        logs,
      });
    }
    
    // Get the 3 results for this page
    const pageSize = 3;
    const pageItems = allItems.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < allItems.length;
    
    logs.push(`[BGG Search] Returning items ${offset + 1} to ${offset + pageItems.length}`);
    
    // Parse basic info from search results (no thumbnails)
    const results: BGGSearchResult[] = pageItems.map((item: any, index: number) => {
      const id = item['@_id'];
      
      // Get primary name
      let title = '';
      if (item.name) {
        const names = Array.isArray(item.name) ? item.name : [item.name];
        const primaryName = names.find((n: any) => n['@_type'] === 'primary');
        title = primaryName?.['@_value'] || names[0]?.['@_value'] || '';
      }
      
      const yearPublished = parseInt(item.yearpublished?.['@_value'], 10) || undefined;
      
      logs.push(`[BGG Search] Item ${index + 1}: ID=${id}, Title="${title}", Year=${yearPublished || 'N/A'}`);
      
      return {
        id,
        title,
        yearPublished,
      };
    }).filter((r: BGGSearchResult) => r.title); // Filter out entries without titles
    
    const duration = Date.now() - startTime;
    logs.push(`[BGG Search] Total time: ${duration}ms`);
    logs.push(`[BGG Search] Success: Returning ${results.length} results`);
    
    return NextResponse.json({
      success: true,
      data: results,
      hasMore,
      total: allItems.length,
      logs,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logs.push(`[BGG Search] Error after ${duration}ms: ${error.message}`);
    console.error('[BGG Search] Full error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to search Board game geek',
      details: error.message,
      logs,
    }, { status: 500 });
  }
}