import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Parse XML to extract description using DOM parsing
function parseDescriptionFromXML(xml: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const descriptionEl = doc.querySelector('description');
    if (!descriptionEl) return '';
    
    // Decode HTML entities
    return (descriptionEl.textContent || '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#10;/g, '\n')
      .replace(/&#13;/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  } catch (error) {
    console.error('Error parsing description XML:', error);
    return '';
  }
}

export async function GET(request: Request) {
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

    // Fetch from BGG API with rate limiting
    // Wait 2 seconds to respect BGG rate limits (5 seconds is recommended between requests)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${gameBggId}`,
      {
        headers: {
          'User-Agent': 'BoardGameNight-App/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`BGG API error: ${response.status}`);
    }

    const xml = await response.text();
    const description = parseDescriptionFromXML(xml);

    if (!description) {
      return NextResponse.json({ 
        description: '',
        message: 'No description available' 
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
      cached: false 
    });

  } catch (error: any) {
    console.error('BGG description fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch description',
      details: error.message 
    }, { status: 500 });
  }
}