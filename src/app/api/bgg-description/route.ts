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
      'User-Agent': 'BoardGameNight-App/1.0',
    };
    
    if (bggToken) {
      headers['Authorization'] = `Bearer ${bggToken}`;
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