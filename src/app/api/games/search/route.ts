import { NextResponse } from 'next/server';
import { searchBGG } from '@/lib/bgg';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const games = await searchBGG(query);
    console.log('API returning games:', games.length);
    return NextResponse.json(games);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
