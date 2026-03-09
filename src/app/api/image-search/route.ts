import { NextResponse } from 'next/server';

// BoardGameGeek image proxy
async function getBGGImages(query: string): Promise<string[]> {
  try {
    // Search BGG for the game
    const searchResponse = await fetch(
      `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`,
      {
        headers: {
          'User-Agent': 'BoardGameNight-App/1.0',
        },
      }
    );

    if (!searchResponse.ok) {
      return [];
    }

    const searchXml = await searchResponse.text();
    
    // Extract game IDs from XML
    const idMatches = searchXml.match(/id="(\d+)"/g);
    if (!idMatches) {
      return [];
    }

    const gameIds = idMatches
      .map(match => match.replace('id="', '').replace('"', ''))
      .slice(0, 3); // Get top 3 results

    const images: string[] = [];

    // Fetch details for each game to get images
    for (const gameId of gameIds) {
      try {
        const detailsResponse = await fetch(
          `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}`,
          {
            headers: {
              'User-Agent': 'BoardGameNight-App/1.0',
            },
          }
        );

        if (detailsResponse.ok) {
          const detailsXml = await detailsResponse.text();
          
          // Extract image URLs
          const imageMatch = detailsXml.match(/<image>([^<]+)<\/image>/);
          const thumbnailMatch = detailsXml.match(/<thumbnail>([^<]+)<\/thumbnail>/);
          
          if (imageMatch) {
            images.push(imageMatch[1]);
          }
          if (thumbnailMatch && !images.includes(thumbnailMatch[1])) {
            images.push(thumbnailMatch[1]);
          }
        }
      } catch {
        // Continue with next game
      }
    }

    return images;
  } catch (error) {
    console.error('BGG image search error:', error);
    return [];
  }
}

// Fallback image suggestions based on game name patterns
function getFallbackImages(gameName: string): string[] {
  const encodedName = encodeURIComponent(gameName);
  
  // Return empty array - UI will show "No images found" and allow manual entry
  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Try to get images from BoardGameGeek
    const bggImages = await getBGGImages(query);
    
    if (bggImages.length > 0) {
      return NextResponse.json({ 
        images: bggImages,
        source: 'bgg'
      });
    }

    // If no BGG images found, return empty with suggestion to search manually
    return NextResponse.json({ 
      images: [],
      message: 'No images found automatically. You can paste an image URL manually or search on Google Images.',
      suggestion: `Try searching on Google Images for "${query} board game box"`
    });

  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search images',
      details: 'An error occurred while searching for images. Please try again or enter an image URL manually.'
    }, { status: 500 });
  }
}