declare module 'boardgamegeek' {
  interface SearchOptions {
    query: string;
    type?: 'boardgame' | 'boardgameexpansion';
    exact?: number;
  }

  interface SearchResult {
    id: number;
    name: string;
    type?: string;
  }

  interface SearchResponse {
    total: number;
    items: SearchResult[];
  }

  interface ThingResult {
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
    mechanics?: Array<{ id: number; name: string }>;
    categories?: Array<{ id: number; name: string }>;
    designers?: Array<{ id: number; name: string }>;
    publishers?: Array<{ id: number; name: string }>;
  }

  interface ThingOptions {
    stats?: 0 | 1;
  }

  interface BGGClient {
    search(options: SearchOptions): Promise<SearchResponse>;
    things(ids: number[], options?: ThingOptions): Promise<ThingResult[]>;
  }

  const bgg: BGGClient;
  export default bgg;
  export { SearchResult, ThingResult, SearchOptions, ThingOptions, SearchResponse };
}
