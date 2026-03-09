import { NextResponse } from 'next/server';

// Common board game categories and mechanics for fallback
const COMMON_CATEGORIES = [
  'Strategy', 'Family', 'Economic', 'Adventure', 'Fantasy', 'Science Fiction',
  'Cooperative', 'Card Game', 'Dice', 'Abstract', 'Wargame', 'Party Game',
  'City Building', 'Exploration', 'Fighting', 'Bluffing', 'Puzzle',
];

const COMMON_MECHANICS = [
  'Dice Rolling', 'Hand Management', 'Set Collection', 'Area Control',
  'Worker Placement', 'Deck Building', 'Tile Placement', 'Auction',
  'Variable Player Powers', 'Push Your Luck', 'Route Building',
  'Trading', 'Cooperative Play', 'Pattern Building', 'Resource Management',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Try BGG API first with timeout
    const bggResult = await Promise.race([
      fetchFromBGG(query),
      new Promise<{ categories: string[]; mechanics: string[]; gameName: string }>((resolve) =>
        setTimeout(() => resolve({ categories: [], mechanics: [], gameName: '' }), 3000)
      ),
    ]);

    // If BGG returned results, use them
    if (bggResult.categories.length > 0 || bggResult.mechanics.length > 0) {
      return NextResponse.json(bggResult);
    }

    // Fallback: suggest based on game name keywords
    const suggestions = generateSuggestionsFromName(query);

    return NextResponse.json({
      ...suggestions,
      message: 'Showing common suggestions. BGG lookup unavailable.',
    });
  } catch (error) {
    console.error('BGG suggestion error:', error);
    
    // Return fallback suggestions on error
    return NextResponse.json({ 
      categories: COMMON_CATEGORIES.slice(0, 6),
      mechanics: COMMON_MECHANICS.slice(0, 6),
      message: 'Showing common suggestions. BGG lookup failed.',
    });
  }
}

async function fetchFromBGG(query: string): Promise<{ categories: string[]; mechanics: string[]; gameName: string }> {
  const categories: string[] = [];
  const mechanics: string[] = [];
  let gameName = query;

  try {
    // Search BGG
    const searchResponse = await fetch(
      `https://api.geekdo.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`,
      {
        headers: {
          'User-Agent': 'BoardGameNight/1.0 (contact@example.com)',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!searchResponse.ok) {
      return { categories, mechanics, gameName };
    }

    const searchXml = await searchResponse.text();
    const idMatch = searchXml.match(/<item[^>]*id="(\d+)"/);
    
    if (!idMatch) {
      return { categories, mechanics, gameName };
    }

    const gameId = idMatch[1];

    // Get game details
    const detailsResponse = await fetch(
      `https://api.geekdo.com/xmlapi2/thing?id=${gameId}`,
      {
        headers: {
          'User-Agent': 'BoardGameNight/1.0 (contact@example.com)',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!detailsResponse.ok) {
      return { categories, mechanics, gameName };
    }

    const detailsXml = await detailsResponse.text();

    // Extract name
    const nameMatch = detailsXml.match(/<name[^>]*type="primary"[^>]*value="([^"]+)"/);
    if (nameMatch) {
      gameName = nameMatch[1];
    }

    // Extract categories
    const categoryRegex = /type="boardgamecategory"[^>]*value="([^"]+)"/g;
    let catMatch;
    while ((catMatch = categoryRegex.exec(detailsXml)) !== null) {
      if (!categories.includes(catMatch[1])) {
        categories.push(catMatch[1]);
      }
    }

    // Extract mechanics
    const mechanicRegex = /type="boardgamemechanic"[^>]*value="([^"]+)"/g;
    let mechMatch;
    while ((mechMatch = mechanicRegex.exec(detailsXml)) !== null) {
      if (!mechanics.includes(mechMatch[1])) {
        mechanics.push(mechMatch[1]);
      }
    }

  } catch (error) {
    console.error('BGG fetch error:', error);
  }

  return { categories, mechanics, gameName };
}

function generateSuggestionsFromName(gameName: string): { categories: string[]; mechanics: string[] } {
  const lowerName = gameName.toLowerCase();
  const categories: string[] = [];
  const mechanics: string[] = [];

  // Keyword-based suggestions
  if (lowerName.includes('war') || lowerName.includes('battle') || lowerName.includes('fight')) {
    categories.push('Wargame');
    mechanics.push('Area Control', 'Fighting');
  }
  
  if (lowerName.includes('city') || lowerName.includes('build') || lowerName.includes('town')) {
    categories.push('City Building');
    mechanics.push('Tile Placement', 'Resource Management');
  }
  
  if (lowerName.includes('card') || lowerName.includes('deck')) {
    categories.push('Card Game');
    mechanics.push('Hand Management', 'Deck Building');
  }
  
  if (lowerName.includes('dice') || lowerName.includes('roll')) {
    mechanics.push('Dice Rolling', 'Push Your Luck');
  }
  
  if (lowerName.includes('puzzle') || lowerName.includes('solve')) {
    categories.push('Puzzle');
    mechanics.push('Pattern Building');
  }
  
  if (lowerName.includes('party') || lowerName.includes('social')) {
    categories.push('Party Game');
  }
  
  if (lowerName.includes('coop') || lowerName.includes('team')) {
    categories.push('Cooperative');
    mechanics.push('Cooperative Play');
  }

  // Add common defaults if few suggestions
  if (categories.length < 3) {
    categories.push(...COMMON_CATEGORIES.slice(0, 5 - categories.length));
  }
  
  if (mechanics.length < 3) {
    mechanics.push(...COMMON_MECHANICS.slice(0, 5 - mechanics.length));
  }

  return {
    categories: categories.slice(0, 8),
    mechanics: mechanics.slice(0, 8),
  };
}
