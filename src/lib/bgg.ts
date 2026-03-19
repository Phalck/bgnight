const BGG_API_BASE = 'https://www.boardgamegeek.com/xmlapi2';

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

async function fetchXML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://boardgamegeek.com/',
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.text();
}

function parseXML(xml: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xml, 'text/xml');
}

export async function searchBGG(query: string): Promise<BGGGame[]> {
  try {
    console.log('Searching BGG for:', query);
    const searchUrl = `${BGG_API_BASE}/search?query=${encodeURIComponent(query)}`;
    console.log('Search URL:', searchUrl);
    const xml = await fetchXML(searchUrl);
    console.log('XML response (first 500 chars):', xml.substring(0, 500));
    const doc = parseXML(xml);
    console.log('Parsed doc, items found');
    
    const items = doc.querySelectorAll('item');
    if (items.length === 0) {
      return [];
    }

    const ids: number[] = [];
    items.forEach((item, index) => {
      if (index < 10) {
        const id = parseInt(item.getAttribute('id') || '0', 10);
        if (id) ids.push(id);
      }
    });

    if (ids.length === 0) {
      return [];
    }

    return getGamesByIds(ids);
  } catch (error) {
    console.error('BGG search error:', error);
    return [];
  }
}

export async function getGameById(id: number): Promise<BGGGame | null> {
  try {
    const games = await getGamesByIds([id]);
    return games[0] || null;
  } catch (error) {
    console.error('BGG get game error:', error);
    return null;
  }
}

async function getGamesByIds(ids: number[]): Promise<BGGGame[]> {
  if (ids.length === 0) return [];

  try {
    const idsParam = ids.join(',');
    const thingUrl = `${BGG_API_BASE}/thing?id=${idsParam}&stats=1`;
    const xml = await fetchXML(thingUrl);
    const doc = parseXML(xml);
    
    const items = doc.querySelectorAll('item');
    const games: BGGGame[] = [];

    items.forEach(item => {
      const game = parseGameItem(item);
      if (game) games.push(game);
    });

    return games;
  } catch (error) {
    console.error('BGG get games error:', error);
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

function parseGameItem(item: Element): BGGGame | null {
  const id = parseInt(item.getAttribute('id') || '0', 10);
  if (!id) return null;

  const nameEl = item.querySelector('name[type="primary"]');
  const name = decodeHtmlEntities(nameEl?.getAttribute('value') || 'Unknown');

  const thumbnail = item.querySelector('thumbnail')?.textContent || undefined;
  const imageRaw = item.querySelector('image')?.textContent || undefined;
  const image = getHighResImageUrl(imageRaw);

  const minPlayers = parseInt(item.querySelector('minplayers')?.getAttribute('value') || '1', 10);
  const maxPlayers = parseInt(item.querySelector('maxplayers')?.getAttribute('value') || '1', 10);

  const minPlayTime = parseInt(item.querySelector('minplaytime')?.getAttribute('value') || '0', 10) || undefined;
  const maxPlayTime = parseInt(item.querySelector('maxplaytime')?.getAttribute('value') || '0', 10) || undefined;

  const yearPublished = parseInt(item.querySelector('yearpublished')?.getAttribute('value') || '0', 10) || undefined;

  const description = decodeHtmlEntities(item.querySelector('description')?.textContent || '');

  // Parse statistics (complexity/weight and rating)
  const averageweight = item.querySelector('averageweight');
  const complexity = averageweight ? parseFloat(averageweight.getAttribute('value') || '0') || undefined : undefined;

  const average = item.querySelector('average');
  const bggRating = average ? parseFloat(average.getAttribute('value') || '0') || undefined : undefined;

  const mechanics: string[] = [];
  item.querySelectorAll('link[type="boardgamemechanic"]').forEach(link => {
    const value = link.getAttribute('value');
    if (value) mechanics.push(decodeHtmlEntities(value));
  });

  const categories: string[] = [];
  item.querySelectorAll('link[type="boardgamecategory"]').forEach(link => {
    const value = link.getAttribute('value');
    if (value) categories.push(decodeHtmlEntities(value));
  });

  const designers: string[] = [];
  item.querySelectorAll('link[type="boardgamedesigner"]').forEach(link => {
    const value = link.getAttribute('value');
    if (value) designers.push(decodeHtmlEntities(value));
  });

  const publishers: string[] = [];
  item.querySelectorAll('link[type="boardgamepublisher"]').forEach(link => {
    const value = link.getAttribute('value');
    if (value) publishers.push(decodeHtmlEntities(value));
  });

  return {
    id,
    name,
    thumbnail,
    image,
    minPlayers,
    maxPlayers,
    minPlayTime: minPlayTime || undefined,
    maxPlayTime: maxPlayTime || undefined,
    yearPublished,
    description,
    mechanics,
    categories,
    designers,
    publishers,
    complexity,
    bggRating,
  };
}
