import { XMLParser } from 'fast-xml-parser';
import { bggHeaders } from './bgg-headers';
import { asArray, toInt, toFloat, primaryName, BggXmlItem } from './bgg-xml';

// Use the bare host: www.boardgamegeek.com 301-redirects to it, and fetch drops the
// Authorization header on a cross-host redirect, which turns into a 401.
const BGG_API_BASE = 'https://boardgamegeek.com/xmlapi2';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
});

// Transform BGG image URL to get high-resolution version
function getHighResImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // Replace /med/ with /original/ to get full resolution image
  return url.replace('/med/', '/original/');
}

export interface BGGGame {
  id: number;
  name: string;
  thumbnail?: string;
  image?: string;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime?: number;
  maxPlayTime?: number;
  yearPublished?: number;
  description?: string;
  mechanics: string[];
  categories: string[];
  designers: string[];
  publishers: string[];
  complexity?: number;
  bggRating?: number;
}

// Simplified search result for caching
export interface BGGSearchResult {
  id: number;
  name: string;
  thumbnail?: string;
  yearPublished?: number;
}

// Immediate logging when library loads
console.log('[BGG Library] ============================================');
console.log('[BGG Library] Module loaded at:', new Date().toISOString());
console.log('[BGG Library] BGG_API_TOKEN exists:', !!process.env.BGG_API_TOKEN);
console.log('[BGG Library] BGG_API_TOKEN length:', process.env.BGG_API_TOKEN?.length || 0);
console.log('[BGG Library] All BGG env vars:', Object.keys(process.env).filter(k => k.includes('BGG')));
console.log('[BGG Library] ============================================');

async function fetchXML(url: string): Promise<string> {
  const headers = bggHeaders();

  // Add authentication token if available
  const bggToken = process.env.BGG_API_TOKEN?.trim();
  
  console.log('[BGG fetchXML] ============================================');
  console.log('[BGG fetchXML] URL:', url);
  console.log('[BGG fetchXML] Token available:', !!bggToken);
  console.log('[BGG fetchXML] Token length:', bggToken?.length || 0);
  
  if (bggToken) {
    headers['Authorization'] = `Bearer ${bggToken}`;
    console.log('[BGG fetchXML] Added Authorization header');
  } else {
    console.log('[BGG fetchXML] WARNING: No authentication token!');
  }
  
  console.log('[BGG fetchXML] Headers:', Object.keys(headers));
  console.log('[BGG fetchXML] ============================================');

  const response = await fetch(url, { headers });
  
  console.log('[BGG fetchXML] Response status:', response.status, response.statusText);
  console.log('[BGG fetchXML] Response headers:', Object.fromEntries(response.headers.entries()));
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[BGG] HTTP Error:', response.status, errorText.substring(0, 500));
    throw new Error(`Request failed with ${response.status}: ${errorText.substring(0, 200)}`);
  }
  return response.text();
}

// Delay function for rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function searchBGG(query: string): Promise<BGGGame[]> {
  try {
    console.log('Searching BGG for:', query);
    
    // Wait 5 seconds to respect BGG rate limit (1 request per 5 seconds)
    await delay(5000);
    
    const searchUrl = `${BGG_API_BASE}/search?query=${encodeURIComponent(query)}`;
    console.log('[BGG] Searching for:', query);
    console.log('[BGG] Search URL:', searchUrl);
    
    const xml = await fetchXML(searchUrl);
    console.log('[BGG] Search response length:', xml.length);
    console.log('[BGG] Search response preview (first 1000 chars):', xml.substring(0, 1000));
    
    const items = asArray<BggXmlItem>(xmlParser.parse(xml)?.items?.item);
    console.log('[BGG] Search found items:', items.length);
    
    if (items.length === 0) {
      console.log('[BGG] No items found for query:', query);
      return [];
    }

    const ids: number[] = [];
    items.slice(0, 10).forEach((item, index) => {
      const id = toInt(item['@_id']) || 0;
      console.log(`[BGG] Search result ${index + 1}: ID=${id}, Name=${primaryName(item) ?? 'Unknown'}`);
      if (id) ids.push(id);
    });

    console.log('[BGG] IDs to fetch:', ids);

    if (ids.length === 0) {
      console.log('[BGG] No valid IDs found');
      return [];
    }

    return getGamesByIds(ids);
  } catch (error) {
    console.error('[BGG] Search error for query:', query, error);
    return [];
  }
}

export async function getGameById(id: number): Promise<BGGGame | null> {
  try {
    console.log('[BGG] getGameById called with ID:', id);
    const games = await getGamesByIds([id]);
    console.log('[BGG] getGameById result:', games.length > 0 ? `Found ${games[0].name}` : 'Not found');
    return games[0] || null;
  } catch (error) {
    console.error('[BGG] getGameById error for ID:', id, error);
    return null;
  }
}

async function getGamesByIds(ids: number[]): Promise<BGGGame[]> {
  if (ids.length === 0) return [];

  try {
    // Wait 5 seconds to respect BGG rate limit (1 request per 5 seconds)
    await delay(5000);
    
    const idsParam = ids.join(',');
    const thingUrl = `${BGG_API_BASE}/thing?id=${idsParam}&stats=1`;
    
    console.log('[BGG] Fetching games with IDs:', ids);
    console.log('[BGG] URL:', thingUrl);
    
    const xml = await fetchXML(thingUrl);
    
    console.log('[BGG] Response length:', xml.length);
    console.log('[BGG] Response preview (first 1000 chars):', xml.substring(0, 1000));
    
    const items = asArray<BggXmlItem>(xmlParser.parse(xml)?.items?.item);
    console.log('[BGG] Number of items found:', items.length);
    
    const games: BGGGame[] = [];

    items.forEach((item, index) => {
      console.log(`[BGG] Parsing item ${index + 1}/${items.length}`);
      const game = parseGameItem(item);
      if (game) {
        console.log(`[BGG] Successfully parsed game: ${game.name} (ID: ${game.id})`);
        games.push(game);
      } else {
        console.log(`[BGG] Failed to parse item ${index + 1}`);
      }
    });

    console.log('[BGG] Total games parsed:', games.length);
    return games;
  } catch (error) {
    console.error('[BGG] Error in getGamesByIds for IDs:', ids, error);
    return [];
  }
}

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

function parseGameItem(item: BggXmlItem): BGGGame | null {
  const id = toInt(item['@_id']) || 0;
  if (!id) return null;

  const name = decodeHtmlEntities(primaryName(item) ?? 'Unknown');

  const thumbnail = item.thumbnail ? String(item.thumbnail) : undefined;
  const image = getHighResImageUrl(item.image ? String(item.image) : undefined);

  const minPlayTime = toInt(item.minplaytime?.['@_value']) || undefined;
  const maxPlayTime = toInt(item.maxplaytime?.['@_value']) || undefined;

  const links = (type: string): string[] =>
    asArray(item.link)
      .filter(l => l['@_type'] === type)
      .map(l => decodeHtmlEntities(String(l['@_value'] ?? '')))
      .filter(Boolean);

  return {
    id,
    name,
    thumbnail,
    image,
    minPlayers: toInt(item.minplayers?.['@_value']) || 1,
    maxPlayers: toInt(item.maxplayers?.['@_value']) || 1,
    minPlayTime,
    maxPlayTime,
    yearPublished: toInt(item.yearpublished?.['@_value']) || undefined,
    description: decodeHtmlEntities(item.description ? String(item.description) : ''),
    mechanics: links('boardgamemechanic'),
    categories: links('boardgamecategory'),
    designers: links('boardgamedesigner'),
    publishers: links('boardgamepublisher'),
    complexity: toFloat(item.statistics?.ratings?.averageweight?.['@_value']) || undefined,
    bggRating: toFloat(item.statistics?.ratings?.average?.['@_value']) || undefined,
  };
}
