import { BGGSearchResult } from './bgg';

interface CacheEntry {
  results: BGGSearchResult[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export function cacheSearchResults(query: string, results: BGGSearchResult[]) {
  searchCache.set(query.toLowerCase(), {
    results,
    timestamp: Date.now()
  });
}

export function getCachedSearchResults(query: string): BGGSearchResult[] | null {
  const entry = searchCache.get(query.toLowerCase());
  if (!entry) return null;
  
  // Check if cache is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    searchCache.delete(query.toLowerCase());
    return null;
  }
  
  return entry.results;
}

export function clearSearchCache() {
  searchCache.clear();
}