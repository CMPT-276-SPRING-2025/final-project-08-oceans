
// Define and export the cache instance
export const mapboxCache = new Map<string, any>();

// Export a function specifically for clearing the cache during tests
export function clearMapboxCacheForTesting() {
  // Add a check to ensure this is only used in the test environment
  if (process.env.NODE_ENV !== 'test') {
    return;
  }
  mapboxCache.clear();
}