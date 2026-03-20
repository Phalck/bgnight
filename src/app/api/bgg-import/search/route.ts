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
  hasPrevious?: boolean;
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

// Comprehensive HTML entity decoder
function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  
  // Handle named entities
  const namedEntities: Record<string, string> = {
    '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&nbsp;': ' ', '&apos;': "'", '&ndash;': '–', '&mdash;': '—',
    '&lsquo;': "'", '&rsquo;': "'", '&ldquo;': '"', '&rdquo;': '"',
    '&hellip;': '…', '&bull;': '•', '&trade;': '™', '&copy;': '©',
    '&reg;': '®', '&deg;': '°', '&euro;': '€', '&pound;': '£',
    '&yen;': '¥', '&cent;': '¢', '&sect;': '§', '&para;': '¶',
    '&middot;': '·', '&iexcl;': '¡', '&iquest;': '¿', '&laquo;': '«',
    '&raquo;': '»', '&lsaquo;': '‹', '&rsaquo;': '›', '&dagger;': '†',
    '&Dagger;': '‡', '&permil;': '‰', '&prime;': '′', '&Prime;': '″',
    '&minus;': '−', '&times;': '×', '&divide;': '÷', '&frasl;': '⁄',
    '&sup1;': '¹', '&sup2;': '²', '&sup3;': '³', '&frac14;': '¼',
    '&frac12;': '½', '&frac34;': '¾', '&ordf;': 'ª', '&ordm;': 'º',
  };
  
  // Replace named entities
  let decoded = text;
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // Handle decimal numeric entities (&#39; -> ')
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return match;
    }
  });
  
  // Handle hexadecimal numeric entities (&#x27; -> ')
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return match;
    }
  });
  
  return decoded;
}

// Fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://boardgamegeek.com/',
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
    
    // Get BGG API token from environment
    const bggToken = process.env.BGG_API_TOKEN;
    logs.push(`[BGG Search] API Token configured: ${bggToken ? 'Yes' : 'No'}`);
    
    // Debug logging for comparison with bulk update
    console.log('[BGG Import Search] ============================================');
    console.log('[BGG Import Search] BGG_API_TOKEN exists:', !!process.env.BGG_API_TOKEN);
    console.log('[BGG Import Search] BGG_API_TOKEN length:', process.env.BGG_API_TOKEN?.length || 0);
    console.log('[BGG Import Search] Token preview:', bggToken ? bggToken.substring(0, 20) + '...' : 'N/A');
    console.log('[BGG Import Search] All env vars:', Object.keys(process.env).filter(k => k.includes('BGG')));
    console.log('[BGG Import Search] ============================================');
    
    // BGG Search API
    const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
    logs.push(`[BGG Search] Request URL: ${searchUrl}`);
    logs.push(`[BGG Search] Timeout: 10s`);
    
    // Build headers with authentication
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://boardgamegeek.com/',
    };
    
    if (bggToken) {
      headers['Authorization'] = `Bearer ${bggToken}`;
      logs.push('[BGG Search] Added Bearer token to request');
    }
    
    let searchResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      searchResponse = await fetch(searchUrl, {
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
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
    
    let allItems = Array.isArray(searchParsed.items.item) 
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
    
    // Parse all items first for sorting
    const parsedItems: Array<{ item: any; title: string; yearPublished?: number }> = allItems.map((item: any) => {
      const id = item['@_id'];
      
      // Get primary name and decode HTML entities
      let title = '';
      if (item.name) {
        const names = Array.isArray(item.name) ? item.name : [item.name];
        const primaryName = names.find((n: any) => n['@_type'] === 'primary');
        title = decodeHtmlEntities(primaryName?.['@_value'] || names[0]?.['@_value'] || '');
      }
      
      const yearPublished = parseInt(item.yearpublished?.['@_value'], 10) || undefined;
      
      return { item, title, yearPublished };
    }).filter((r: any) => r.title); // Filter out entries without titles
    
    // Sort by relevance: exact match > starts with > contains > other
    const searchLower = gameName.toLowerCase().trim();
    const scoredItems = parsedItems.map((parsed: any) => {
      const titleLower = parsed.title.toLowerCase();
      let score = 0;
      
      if (titleLower === searchLower) {
        score = 3; // Exact match
      } else if (titleLower.startsWith(searchLower)) {
        score = 2; // Starts with search term
      } else if (titleLower.includes(searchLower)) {
        score = 1; // Contains search term
      }
      
      return { ...parsed, score };
    });
    
    // Sort by score (descending), then by year (newest first) for ties
    scoredItems.sort((a: any, b: any) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // If same score, prefer newer games
      return (b.yearPublished || 0) - (a.yearPublished || 0);
    });
    
    logs.push(`[BGG Search] Sorted ${scoredItems.length} items by relevance`);
    
    // Get the 3 results for this page
    const pageSize = 3;
    const pageItems = scoredItems.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < scoredItems.length;
    const hasPrevious = offset > 0;
    
    logs.push(`[BGG Search] Returning items ${offset + 1} to ${offset + pageItems.length}`);
    
    // Map to final results
    const results: BGGSearchResult[] = pageItems.map((parsed: any, index: number) => {
      logs.push(`[BGG Search] Item ${index + 1}: ID=${parsed.item['@_id']}, Title="${parsed.title}", Year=${parsed.yearPublished || 'N/A'}, Score=${parsed.score}`);
      
      return {
        id: parsed.item['@_id'],
        title: parsed.title,
        yearPublished: parsed.yearPublished,
      };
    });
    
    const duration = Date.now() - startTime;
    logs.push(`[BGG Search] Total time: ${duration}ms`);
    logs.push(`[BGG Search] Success: Returning ${results.length} results`);
    
    return NextResponse.json({
      success: true,
      data: results,
      hasMore,
      hasPrevious,
      total: scoredItems.length,
      logs,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logs.push(`[BGG Search] Error after ${duration}ms: ${error.message}`);
    console.error('[BGG Search] Full error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to search BoardGameGeek',
      details: error.message,
      logs,
    }, { status: 500 });
  }
}