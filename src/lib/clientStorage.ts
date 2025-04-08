interface StorageItem<T> {
  data: T;
  expiry: number;
}

/*
saveToSessionStorage: Converts item into StorageItem and saves them into sessional storage
Input: API key as string, data, expiry time
*/
export function saveToSessionStorage<T>(key: string, data: T, expiryMinutes: number = 60): void {
  try {

    // Check if the code is running in a browser environment
    if (typeof window === 'undefined') return;

    const now = new Date();
    const item: StorageItem<T> = {
      data,
      expiry: now.getTime() + expiryMinutes * 60 * 1000,
    };

    sessionStorage.setItem(key, JSON.stringify(item));

  } catch (error) {
  }
}

/*
getFromSessionStorage: Takes in key and fetches the sessional saved item 
*/
export function getFromSessionStorage<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null; 

    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;

    const item: StorageItem<T> = JSON.parse(itemStr);
    const now = new Date();

    //If the item is expired, remove it from sessionStorage and return null
    if (now.getTime() > item.expiry) {
      sessionStorage.removeItem(key);

      return null;
    }

    return item.data;
  } catch (error) {

    return null;
  }
}

//removeFromSessionStorage: Takes in key as string and removes the associated item from storage
export function removeFromSessionStorage(key: string): void {
  try {
    if (typeof window === 'undefined') return;

    sessionStorage.removeItem(key);

  } catch (error) {

  }
}

//generateCacheKey: Takes in string as key and record, and returns generated cache key for it to store in storage
export function generateCacheKey(baseKey: string, params: Record<string, any> = {}): string {
  const sortedParams = Object.keys(params)
    .sort()
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${key}:${params[key]}`)
    .join('|');

  return sortedParams ? `${baseKey}_${sortedParams}` : baseKey;
}

//clearSessionStorage: takes in string prefix as the petfinder API, clears all keys associated from sessional storage
export function clearSessionStorage(prefix: string = 'petfinder_'): void {
  try {
    if (typeof window === 'undefined') return;

    //Checks if the prefix is a string and not empty
    if (!prefix) {
      sessionStorage.clear();

      return;
    }

    Object.keys(sessionStorage).forEach(key => {
      //Checks if the key starts with the prefix
      if (key.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    });

  } catch (error) {

  }
}
