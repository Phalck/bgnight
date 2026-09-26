import { XMLParser } from 'fast-xml-parser';
import { asArray, toInt, toFloat, BggXmlItem } from './bgg-xml';
import { bggHeaders } from './bgg-headers';
import { toErrorMessage } from './error-utils';

export interface BGGGameData {
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
  return url.replace('/med/', '/original/');
}

// Comprehensive HTML entity decoder
function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  
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
  
  let decoded = text;
  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return match;
    }
  });
  
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return match;
    }
  });
  
  decoded = decoded.replace(/&#10;/g, '\n').replace(/&#13;/g, '');
  
  return decoded;
}

// Parse XML to extract game data
function parseGameXML(xml: string): { gameData: BGGGameData | null; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const parsed = parser.parse(xml);
    
    if (!parsed.items || !parsed.items.item) {
      errors.push('No items found in XML response');
      return { gameData: null, errors };
    }

    const item = asArray<BggXmlItem>(parsed.items.item)[0];
    
    if (!item) {
      errors.push('Could not extract item from parsed XML');
      return { gameData: null, errors };
    }

    // Get primary name
    let title = '';
    if (item.name) {
      const names = asArray(item.name);
      const primaryName = names.find(n => n['@_type'] === 'primary');
      title = String(primaryName?.['@_value'] || names[0]?.['@_value'] || '');
    }
    
    if (!title) {
      errors.push('No title found in game data');
    }

    // Get rank from ratings
    let bggRank = 0;
    if (item.statistics?.ratings?.ranks?.rank) {
      const ranks = asArray(item.statistics.ratings.ranks.rank);
      const boardgameRank = ranks.find(r => r['@_name'] === 'boardgame');
      if (boardgameRank && boardgameRank['@_value'] !== 'Not Ranked') {
        bggRank = toInt(boardgameRank['@_value']) || 0;
      }
    }

    // Get links
    const getLinks = (type: string): string[] =>
      asArray(item.link)
        .filter(l => l['@_type'] === type)
        .map(l => l['@_value'])
        .filter(Boolean)
        .map(String);

    const complexity = toFloat(item.statistics?.ratings?.averageweight?.['@_value']) || 0;
    const bggRating = toFloat(item.statistics?.ratings?.average?.['@_value']) || 0;

    const gameData: BGGGameData = {
      title: decodeHtmlEntities(title),
      description: decodeHtmlEntities(item.description ?? ''),
      yearPublished: toInt(item.yearpublished?.['@_value']) || 0,
      minPlayers: toInt(item.minplayers?.['@_value']) || 1,
      maxPlayers: toInt(item.maxplayers?.['@_value']) || 1,
      minPlayTime: toInt(item.minplaytime?.['@_value']) || 0,
      maxPlayTime: toInt(item.maxplaytime?.['@_value']) || 0,
      minAge: toInt(item.minage?.['@_value']) || 0,
      complexity,
      bggRating,
      bggRatingsCount: toInt(item.statistics?.ratings?.usersrated?.['@_value']) || 0,
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
  } catch (error) {
    errors.push(`XML parsing error: ${toErrorMessage(error)}`);
    return { gameData: null, errors };
  }
}

// Fetch BGG game data by ID
export async function fetchBGGGameById(gameId: number): Promise<BGGGameData | null> {
  try {
    console.log('[BGG Import] Fetching game ID:', gameId);
    
    const bggToken = process.env.BGG_API_TOKEN?.trim();
    
    const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
    console.log('[BGG Import] URL:', detailsUrl);
    
    const headers = bggHeaders();
    
    if (bggToken) {
      headers['Authorization'] = `Bearer ${bggToken}`;
      console.log('[BGG Import] Using authentication token');
    } else {
      console.log('[BGG Import] No authentication token available');
    }
    
    const response = await fetch(detailsUrl, { headers });
    console.log('[BGG Import] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BGG Import] HTTP Error:', response.status, errorText.substring(0, 500));
      throw new Error(`BGG API returned ${response.status}: ${errorText.substring(0, 200)}`);
    }
    
    const xml = await response.text();
    console.log('[BGG Import] XML length:', xml.length);
    
    const { gameData, errors } = parseGameXML(xml);
    
    if (errors.length > 0) {
      console.error('[BGG Import] Parse errors:', errors);
    }
    
    return gameData;
  } catch (error) {
    console.error('[BGG Import] Error fetching game:', error);
    throw error;
  }
}