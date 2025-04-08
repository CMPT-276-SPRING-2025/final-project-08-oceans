export const mapboxCache = new Map<string, any>();

export function clearMapboxCacheForTesting() {
  // Clears the cache only in test environment
  if (process.env.NODE_ENV !== 'test') {
    return;
  }
  mapboxCache.clear();
}