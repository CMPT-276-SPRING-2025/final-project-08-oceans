
// Type definitions for stored data
interface StorageItem<T> {
  data: T;
  expiry: number;
}

//Saves data to sessionStorage with an expiration time
export function saveToSessionStorage<T>(key: string, data: T, expiryMinutes: number = 60): void {
  try {
    if (typeof window === 'undefined') return; // Don't run on server

    const now = new Date();
    const item: StorageItem<T> = {
      data,
      expiry: now.getTime() + expiryMinutes * 60 * 1000,
    };

    sessionStorage.setItem(key, JSON.stringify(item));

  } catch (error) {
  }
}

//Retrieves data from sessionStorage if it exists and hasn't expired
export function getFromSessionStorage<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null; 

    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;

    const item: StorageItem<T> = JSON.parse(itemStr);
    const now = new Date();

    // Check if the item has expired
    if (now.getTime() > item.expiry) {
      sessionStorage.removeItem(key);

      return null;
    }

    return item.data;
  } catch (error) {

    return null;
  }
}

//Removes an item from sessionStorage
export function removeFromSessionStorage(key: string): void {
  try {
    if (typeof window === 'undefined') return; // Don't run on server

    sessionStorage.removeItem(key);

  } catch (error) {

  }
}


export function generateCacheKey(baseKey: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${key}:${params[key]}`)
    .join('|');

  return sortedParams ? `${baseKey}_${sortedParams}` : baseKey;
}

//Clears all Love At First Paw data from sessionStorage
export function clearSessionStorage(prefix: string = 'petfinder_'): void {
  try {
    if (typeof window === 'undefined') return; // Don't run on server

    // If no prefix specified, clear everything
    if (!prefix) {
      sessionStorage.clear();

      return;
    }

    // Clear only items with the given prefix
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    });

  } catch (error) {

  }
}
