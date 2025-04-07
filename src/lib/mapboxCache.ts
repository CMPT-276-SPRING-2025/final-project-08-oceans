
// Define and export the cache instance
export const mapboxCache = new Map<string, any>();

// Export a function specifically for clearing the cache during tests
export function clearMapboxCacheForTesting() {
  // Add a check to ensure this is only used in the test environment
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Attempted to clear Mapbox cache outside of test environment. This function should only be called during testing.');
    return;
  }
  console.log('Clearing Mapbox cache for testing...'); // Add log for visibility in tests
  mapboxCache.clear();
}