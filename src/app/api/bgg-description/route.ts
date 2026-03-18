import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { XMLParser } from 'fast-xml-parser';

// Configure XML parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
});

// Parse XML to extract description
function parseDescriptionFromXML(xml: string): { description: string; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const parsed = parser.parse(xml);
    
    if (!parsed.items || !parsed.items.item) {
      errors.push('No items found in XML response');
      return { description: '', errors };
    }

    const item = Array.isArray(parsed.items.item) ? parsed.items.item[0] : parsed.items.item;
    
    if (!item) {
      errors.push('Could not extract item from parsed XML');
      return { description: '', errors };
    }

    // Comprehensive HTML entity decoder
    const decodeHtml = (text: string): string => {
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
      
      // Handle common numeric line breaks
      decoded = decoded.replace(/&#10;/g, '\n').replace(/&#13;/g, '');
      
      return decoded;
    };

    const description = decodeHtml(item.description || '');
    
    if (!description) {
      errors.push('No description found in game data');
    }

    return { description, errors };
  } catch (error: any) {
    errors.push(`XML parsing error: ${error.message}`);
    return { description: '', errors };
  }
}

export async function GET(request: Request) {
  const logs: string[] = [];
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bggId = searchParams.get('bggId');
    const gameId = searchParams.get('gameId');

    if (!bggId && !gameId) {
      return NextResponse.json({ 
        error: 'Either bggId or gameId is required' 
      }, { status: 400 });
    }

    let game;
    let gameBggId: number;

    if (gameId) {
      // Fetch game from database
      game = await prisma.game.findFirst({
        where: { 
          id: gameId,
          userId: session.user.id 
        },
      });

      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      // Check if description is already cached
      if (game.description) {
        return NextResponse.json({ 
          description: game.description,
          cached: true 
        });
      }

      gameBggId = game.bggId;
    } else {
      gameBggId = parseInt(bggId!, 10);
    }

    logs.push(`Fetching description for BGG ID: ${gameBggId}`);

    // Get BGG token from environment
    const bggToken = process.env.BGG_API_TOKEN;
    logs.push(`BGG Token configured: ${bggToken ? 'Yes' : 'No'}`);

    // Fetch from BGG API with rate limiting
    // Wait 5 seconds to respect BGG rate limits
    logs.push('Waiting 5 seconds for rate limit...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${gameBggId}`;
    logs.push(`Request URL: ${url}`);

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://boardgamegeek.com/',
    };
    
    if (bggToken) {
      headers['Authorization'] = `Bearer ${bggToken}`;
      logs.push('Added Bearer token to request');
    }

    const response = await fetch(url, { headers });
    logs.push(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      logs.push(`Error response: ${errorText.substring(0, 500)}`);
      throw new Error(`BGG API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const xml = await response.text();
    logs.push(`XML length: ${xml.length} chars`);
    logs.push(`XML preview: ${xml.substring(0, 300)}...`);
    
    const { description, errors } = parseDescriptionFromXML(xml);
    
    if (errors.length > 0) {
      logs.push(...errors.map(e => `Parse error: ${e}`));
    }

    if (!description) {
      return NextResponse.json({ 
        description: '',
        message: 'No description available',
        logs,
        rawXml: xml.substring(0, 2000),
      });
    }

    // Cache description in database if we have a gameId
    if (gameId) {
      await prisma.game.update({
        where: { id: gameId },
        data: { description },
      });
    }

    return NextResponse.json({ 
      description,
      cached: false,
      logs,
    });

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error('BGG description fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch description',
      details: errorMessage,
      logs,
    }, { status: 500 });
  }
}