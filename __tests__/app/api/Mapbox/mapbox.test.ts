import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, cache } from '../../../../src/app/api/mapbox/route';
// ResponseInit is a standard type, no need to import from next/server

// Define a type to hold the captured response data
type CapturedResponse = {
  body: any;
  status: number;
};

// Variable to capture the arguments passed to NextResponse.json
let capturedResponse: CapturedResponse | null = null;

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    // Mock json to capture its arguments
    json: (body: any, init?: ResponseInit) => {
      capturedResponse = {
        body: body,
        status: init?.status ?? 200, // Default to 200 if status is not provided
      };
      // Return a minimal object satisfying the Response structure if needed by the caller
      // but the tests will primarily assert on 'capturedResponse'.
      return {
        ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
        status: init?.status ?? 200,
        headers: new Headers(init?.headers),
        json: async () => body, // Provide a mock json() method
        text: async () => JSON.stringify(body), // Provide a mock text() method
      };
    },
  },
  NextRequest: jest.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
    const mockUrl = typeof url === 'string' ? new URL(url) : url;
    const mockJsonImplementation = async () => {
      if (init?.body && typeof init.body === 'string') {
        try {
          return Promise.resolve(JSON.parse(init.body));
        } catch (e) {
          return Promise.reject(e); 
        }
      }
      return Promise.resolve(undefined); // Default case if no body or not JSON
    };

    return {
      url: mockUrl.toString(),
      headers: new Headers(init?.headers), // Ensure headers are included
      method: init?.method ?? 'GET', // Ensure method is included
      ...(init || {}),
      json: jest.fn().mockImplementation(mockJsonImplementation),
      searchParams: mockUrl.searchParams,
      clone: jest.fn().mockReturnThis(), // Add clone method if needed by the handler
    };
  }),
}));


global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

const MOCK_MAPBOX_KEY = 'pk.test_key_123';
const MOCK_GEOCODE_SUCCESS_RESPONSE = {
  features: [
    {
      id: 'place.123',
      place_name: '123 Main St, Anytown, USA',
      geometry: { coordinates: [-74.006, 40.7128] },
      place_type: ['address'],
      relevance: 1,
    },
  ],
};
const MOCK_DIRECTIONS_SUCCESS_RESPONSE = {
  routes: [
    {
      distance: 1000,
      duration: 120,
      geometry: { type: 'LineString', coordinates: [[-74.0, 40.7], [-73.9, 40.8]] },
      legs: [
        {
          steps: [
            { maneuver: { instruction: 'Go straight' }, distance: 500, duration: 60, name: 'Main St', mode: 'driving' },
            { maneuver: { instruction: 'Turn left' }, distance: 500, duration: 60, name: 'Side St', mode: 'driving' },
          ],
        },
      ],
    },
  ],
  waypoints: [
    { name: 'Origin St', location: [-74.0, 40.7] },
    { name: 'Destination Ave', location: [-73.9, 40.8] },
  ],
};

const mockFetchResponse = (data: any, ok = true, status = 200, statusText = 'OK') => {
  (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
    ok,
    status,
    statusText,
    json: jest.fn<() => Promise<any>>().mockResolvedValueOnce(data),
  } as Partial<Response> as Response);
};

const mockFetchError = (error = new Error('Network Error')) => {
  // Use the correctly typed fetch mock
  (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(error);
};

const mockNextRequest = jest.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
  const mockUrl = typeof url === 'string' ? new URL(url) : url;
  
  const mockJsonImplementation = async () => {
    if (init?.body && typeof init.body === 'string') {
      try {
        return Promise.resolve(JSON.parse(init.body));
      } catch (e) {
        return Promise.reject(e); 
      }
    }
    return Promise.resolve(undefined);
  };

  return {
    url: mockUrl.toString(),
    ...(init || {}),
    json: jest.fn().mockImplementation(mockJsonImplementation),
    searchParams: mockUrl.searchParams,
  };
});

const createMockRequest = (url: string, options?: RequestInit): NextRequest => {
  return mockNextRequest(url, options) as unknown as NextRequest;
};

describe('Mapbox API Route Handler', () => {
  let originalMapboxKey: string | undefined;

  beforeAll(() => {
    originalMapboxKey = process.env.MAPBOX_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cache.clear();
    process.env.MAPBOX_KEY = MOCK_MAPBOX_KEY;
    capturedResponse = null; // Reset captured response before each test
    // Clear fetch mock calls
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  afterAll(() => {
    process.env.MAPBOX_KEY = originalMapboxKey;
    jest.restoreAllMocks();
  });

  describe('API Key Check', () => {
    it('GET should return 500 if MAPBOX_KEY is not set', async () => {
      delete process.env.MAPBOX_KEY;
      const req = createMockRequest('http://localhost/api/mapbox?action=geocode&address=test');
      await GET(req); // Call the handler

      // Assert on the captured response data
      expect(capturedResponse?.status).toBe(500);
      expect(capturedResponse?.body).toEqual({ error: 'Mapbox API key is not configured' });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('POST should return 500 if MAPBOX_KEY is not set', async () => {
      delete process.env.MAPBOX_KEY;
      const req = createMockRequest('http://localhost/api/mapbox', {
        method: 'POST',
        body: JSON.stringify({ action: 'geocode', addresses: ['test'] }),
      });
      await POST(req); // Call the handler

      // Assert on the captured response data
      expect(capturedResponse?.status).toBe(500);
      expect(capturedResponse?.body).toEqual({ error: 'Mapbox API key is not configured' });
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/mapbox', () => {
    it('should return the Mapbox key hint for the default action', async () => {
      const req = createMockRequest('http://localhost/api/mapbox');
      await GET(req); // Call the handler

      // Assert on the captured response data
      expect(capturedResponse?.status).toBe(200);
      expect(capturedResponse?.body).toEqual({
        mapboxKey: MOCK_MAPBOX_KEY,
        message: 'Use this token for client-side map rendering',
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    describe('action=geocode', () => {
      const testAddress = '123 Main St';
      const encodedAddress = encodeURIComponent(testAddress);
      const expectedUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MOCK_MAPBOX_KEY}`;

      it('should return 400 if address parameter is missing', async () => {
        const req = createMockRequest('http://localhost/api/mapbox?action=geocode');
        await GET(req); // Call the handler

        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(400);
        expect(capturedResponse?.body).toEqual({ error: 'Address parameter is required' });
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should successfully geocode an address', async () => {
        mockFetchResponse(MOCK_GEOCODE_SUCCESS_RESPONSE);
        const req = createMockRequest(`http://localhost/api/mapbox?action=geocode&address=${encodedAddress}`);
        await GET(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(expectedUrl);
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toEqual({
          query: testAddress,
          features: MOCK_GEOCODE_SUCCESS_RESPONSE.features.map((f: any) => ({
            id: f.id, // Keep existing mapping logic
            place_name: f.place_name,
            coordinates: f.geometry.coordinates,
            place_type: f.place_type,
            relevance: f.relevance,
          })),
        });
        expect(cache.size).toBe(1);
        expect(cache.has(`geocode:${testAddress}`)).toBe(true);
      });

      it('should return cached geocode result', async () => {
        const cachedData = { query: testAddress, features: [{ id: 'cached' }] };
        cache.set(`geocode:${testAddress}`, cachedData);

        const req = createMockRequest(`http://localhost/api/mapbox?action=geocode&address=${encodedAddress}`);
        await GET(req); // Call the handler

        expect(fetch).not.toHaveBeenCalled();
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toEqual(cachedData);
        expect(cache.size).toBe(1);
      });

      it('should return 500 if Mapbox geocoding API fails', async () => {
        mockFetchResponse({ message: 'API Error' }, false, 500, 'Server Error');
        const req = createMockRequest(`http://localhost/api/mapbox?action=geocode&address=${encodedAddress}`);
        await GET(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(expectedUrl);
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(500);
        expect(capturedResponse?.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.size).toBe(0);
      });

      it('should return 500 if fetch throws an error', async () => {
        mockFetchError();
        const req = createMockRequest(`http://localhost/api/mapbox?action=geocode&address=${encodedAddress}`);
        await GET(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(1);
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(500);
        expect(capturedResponse?.body).toEqual({ error: 'Error processing mapbox request' });
      });
    });

    describe('action=navigation', () => {
      const origin = 'Start Place';
      const destination = 'End Place';
      const mode = 'cycling';
      const waypoints = ['Mid Point 1', 'Mid Point 2'];
      const encodedOrigin = encodeURIComponent(origin);
      const encodedDest = encodeURIComponent(destination);
      const encodedWp1 = encodeURIComponent(waypoints[0]);
      const encodedWp2 = encodeURIComponent(waypoints[1]);

      const originCoords = [-74.1, 40.1];
      const destCoords = [-74.2, 40.2];
      const wp1Coords = [-74.15, 40.15];
      const wp2Coords = [-74.18, 40.18];

      const expectedGeocodeUrlOrigin = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedOrigin}.json?access_token=${MOCK_MAPBOX_KEY}`;
      const expectedGeocodeUrlDest = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedDest}.json?access_token=${MOCK_MAPBOX_KEY}`;
      const expectedGeocodeUrlWp1 = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedWp1}.json?access_token=${MOCK_MAPBOX_KEY}`;
      const expectedGeocodeUrlWp2 = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedWp2}.json?access_token=${MOCK_MAPBOX_KEY}`;
      const expectedDirectionsUrl = `https://api.mapbox.com/directions/v5/mapbox/cycling/${originCoords[0]},${originCoords[1]};${wp1Coords[0]},${wp1Coords[1]};${wp2Coords[0]},${wp2Coords[1]};${destCoords[0]},${destCoords[1]}?alternatives=true&geometries=geojson&overview=full&steps=true&access_token=${MOCK_MAPBOX_KEY}`;

      it('should return 400 if origin or destination parameters are missing', async () => {
        let req = createMockRequest(`http://localhost/api/mapbox?action=navigation&destination=${encodedDest}&mode=${mode}`);
        await GET(req); // Call the handler
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(400);
        expect(capturedResponse?.body).toEqual({ error: 'Origin and destination parameters are required' });

        req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&mode=${mode}`);
        await GET(req); // Call the handler again for the second case
        // Assert on the captured response data for the second call
        expect(capturedResponse?.status).toBe(400);
        expect(capturedResponse?.body).toEqual({ error: 'Origin and destination parameters are required' });
        expect(fetch).not.toHaveBeenCalled(); // fetch shouldn't be called in either case
      });

      it('should successfully get directions with origin, destination, and mode', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] }); // Geocode Origin
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] }); // Geocode Destination
        mockFetchResponse(MOCK_DIRECTIONS_SUCCESS_RESPONSE); // Directions

        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=driving`);
        await GET(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining(encodedOrigin)); // Check geocode origin call
        expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining(encodedDest));
        expect(fetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/mapbox/driving/')); // Check directions profile
        expect(fetch).toHaveBeenNthCalledWith(3, expect.stringContaining(`${originCoords.join(',')};${destCoords.join(',')}`)); // Check directions coordinates

        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toHaveProperty('routes');
        expect(capturedResponse?.body).toHaveProperty('waypoints');
        expect(capturedResponse?.body.mode).toBe('driving');
        expect(capturedResponse?.body.origin.name).toBe(origin);
        expect(capturedResponse?.body.destination.name).toBe(destination);
        expect(cache.has(`navigation:${origin}:${destination}:driving:`)).toBe(true);
      });

      it('should successfully get directions with waypoints', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] }); // Geocode Origin
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] }); // Geocode Destination (order matters for Promise.all)
        mockFetchResponse({ features: [{ geometry: { coordinates: wp1Coords } }] }); // Geocode WP1
        mockFetchResponse({ features: [{ geometry: { coordinates: wp2Coords } }] }); // Geocode WP2
        mockFetchResponse(MOCK_DIRECTIONS_SUCCESS_RESPONSE); // Directions

        const waypointsQuery = waypoints.map(encodeURIComponent).join('|');
        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=${mode}&waypoints=${waypointsQuery}`);
        await GET(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(5); // 1 origin + 1 dest + 2 waypoints + 1 directions
        expect(fetch).toHaveBeenNthCalledWith(1, expectedGeocodeUrlOrigin); // Geocode origin
        expect(fetch).toHaveBeenNthCalledWith(2, expectedGeocodeUrlDest);
        expect(fetch).toHaveBeenNthCalledWith(3, expectedGeocodeUrlWp1); // Geocode waypoint 1
        expect(fetch).toHaveBeenNthCalledWith(4, expectedGeocodeUrlWp2); // Geocode waypoint 2
        expect(fetch).toHaveBeenNthCalledWith(5, expect.stringContaining('/directions/v5/mapbox/cycling/')); // Directions call

        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toHaveProperty('routes');
        expect(capturedResponse?.body.mode).toBe(mode);
        const cacheKey = `navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`;
        expect(cache.has(cacheKey)).toBe(true);
      });

      it('should return cached navigation result', async () => {
        const cacheKey = `navigation:${origin}:${destination}:walking:`;
        const cachedData = { routes: [{ id: 'cached_route' }], mode: 'walking' };
        cache.set(cacheKey, cachedData);

        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=walking`);
        await GET(req); // Call the handler

        expect(fetch).not.toHaveBeenCalled();
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toEqual(cachedData);
      });

      it('should return 500 if Mapbox geocoding fails during navigation', async () => {
        mockFetchResponse({ message: 'Geocode Fail' }, false, 404); // Mock geocode failure
        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=driving`);
        await GET(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(1); // Only the first geocode call should happen
        // Assert on the captured response data (from the catch block)
        expect(capturedResponse?.status).toBe(500);
        expect(capturedResponse?.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.size).toBe(0);
      });

      it('should return 500 if Mapbox directions API fails', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] }); // Geocode Origin OK
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] }); // Geocode Destination OK
        mockFetchResponse({ message: 'Directions Fail' }, false, 500); // Directions Fail

        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=driving`);
        await GET(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(3); // 2 geocode + 1 directions
        // Assert on the captured response data (from the catch block)
        expect(capturedResponse?.status).toBe(500);
        expect(capturedResponse?.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.size).toBe(0); // No cache on error
      });

      it('should return 500 if geocoding does not return coordinates', async () => {
        mockFetchResponse({ features: [] }); // Origin geocode returns no features
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] }); // Destination geocode OK

        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=driving`);
        await GET(req); // Call the handler

        // Geocoding for origin and destination happens, but origin fails to provide coords
        expect(fetch).toHaveBeenCalledTimes(2);
        // Assert on the captured response data (from the catch block in getDirections)
        expect(capturedResponse?.status).toBe(500);
        expect(capturedResponse?.body).toEqual({ error: 'Error processing mapbox request' });
      });
    });
  });

  describe('POST /api/mapbox', () => {
    describe('action=geocode', () => {
      const addresses = ['Address 1', 'Address 2'];
      const encodedAddr1 = encodeURIComponent(addresses[0]);
      const encodedAddr2 = encodeURIComponent(addresses[1]);
      const expectedUrl1 = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddr1}.json?access_token=${MOCK_MAPBOX_KEY}`;
      const expectedUrl2 = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddr2}.json?access_token=${MOCK_MAPBOX_KEY}`;

      it('should return 400 if addresses field is missing or invalid', async () => {
        let req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode' })
        });
        await POST(req); // Call handler
        // Assert on captured response
        expect(capturedResponse?.status).toBe(400);
        expect(capturedResponse?.body).toEqual({ error: 'Valid addresses array is required' });

        req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: 'not-an-array' })
        });
        await POST(req); // Call handler
        // Assert on captured response
        expect(capturedResponse?.status).toBe(400);
        expect(capturedResponse?.body).toEqual({ error: 'Valid addresses array is required' });

        req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: [] })
        });
        await POST(req); // Call handler
        // Assert on captured response
        expect(capturedResponse?.status).toBe(400);
        expect(capturedResponse?.body).toEqual({ error: 'Valid addresses array is required' });
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should successfully geocode multiple addresses', async () => {
        const result1 = { features: [{ id: 'place.1', geometry: { coordinates: [1, 1] } }] }; // Add coordinates
        const result2 = { features: [{ id: 'place.2', geometry: { coordinates: [2, 2] } }] }; // Add coordinates
        mockFetchResponse(result1); // Mock fetch for address 1
        mockFetchResponse(result2); // Mock fetch for address 2

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: addresses }),
        });
        await POST(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenNthCalledWith(1, expectedUrl1);
        expect(fetch).toHaveBeenNthCalledWith(2, expectedUrl2);
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toHaveProperty('results');
        expect(capturedResponse?.body.results).toHaveLength(2);
        expect(capturedResponse?.body.results[0].query).toBe(addresses[0]);
        expect(capturedResponse?.body.results[1].query).toBe(addresses[1]);
        // Check features structure based on geocodeAddress function
        expect(capturedResponse?.body.results[0].features[0]).toHaveProperty('id', 'place.1');
        expect(capturedResponse?.body.results[1].features[0]).toHaveProperty('id', 'place.2');
        expect(cache.size).toBe(2);
        expect(cache.has(`geocode:${addresses[0]}`)).toBe(true);
        expect(cache.has(`geocode:${addresses[1]}`)).toBe(true);
      });

      it('should use cached results and fetch non-cached addresses', async () => {
        // Ensure cached result matches the structure returned by geocodeAddress
        const cachedResult = { query: addresses[0], features: [{ id: 'cached', coordinates: [0, 0] }] };
        cache.set(`geocode:${addresses[0]}`, cachedResult);

        const freshResult = { features: [{ id: 'place.2', geometry: { coordinates: [2, 2] } }] }; // Add geometry
        mockFetchResponse(freshResult); // Mock fetch for the non-cached address

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: addresses }),
        });
        await POST(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(1); // Only called for the non-cached address
        expect(fetch).toHaveBeenCalledWith(expectedUrl2);
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body.results).toHaveLength(2);
        expect(capturedResponse?.body.results[0]).toEqual(cachedResult); // First result from cache
        expect(capturedResponse?.body.results[1].query).toBe(addresses[1]); // Second result fetched
        expect(capturedResponse?.body.results[1].features[0]).toHaveProperty('id', 'place.2');
        expect(cache.size).toBe(2); // Both should be in cache now
      });

      it('should return 500 if any Mapbox geocoding API call fails (Promise.all rejection)', async () => {
        mockFetchResponse({ features: [{ id: 'place.1', geometry: { coordinates: [1, 1] } }] }); // First call OK
        mockFetchResponse({ message: 'API Error' }, false, 500); // Second call fails

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: addresses }),
        });
        await POST(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(2); // Both fetches are attempted
        // Assert on the captured response data (from the catch block)
        expect(capturedResponse?.status).toBe(500);
        expect(capturedResponse?.body).toEqual({ error: 'Error processing mapbox request' });
        // The successful geocode should still be cached
        expect(cache.has(`geocode:${addresses[0]}`)).toBe(true);
        expect(cache.has(`geocode:${addresses[1]}`)).toBe(false); // Failed one is not cached
      });

      it('should return 500 if request body is invalid JSON', async () => {
        const invalidJsonBody = "{ action: 'geocode', addresses: ['test' "; // Invalid JSON

        // Use the standard mock request creator, the error comes from request.json() mock
        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST',
          body: invalidJsonBody,
        });

        // Manually set the mock for request.json() to reject for this specific request object
        (req.json as jest.Mock).mockRejectedValueOnce(new SyntaxError('Unexpected token...') as any); // Cast error to any

        await POST(req); // Call the handler

        // Assert on the captured response data (from the main catch block)
        expect(capturedResponse?.status).toBe(500);
        expect(capturedResponse?.body).toEqual({ error: 'Error processing mapbox request' });
        expect(fetch).not.toHaveBeenCalled();
      });
    });

    describe('action=navigation', () => {
      const origin = 'Start Place Post';
      const destination = 'End Place Post';
      const mode = 'walking';
      const waypoints = ['Mid Point Post'];
      const encodedOrigin = encodeURIComponent(origin);
      const encodedDest = encodeURIComponent(destination);
      const encodedWp = encodeURIComponent(waypoints[0]);

      const originCoords = [-75.1, 41.1];
      const destCoords = [-75.2, 41.2];
      const wpCoords = [-75.15, 41.15];

      const expectedGeocodeUrlOrigin = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedOrigin}.json?access_token=${MOCK_MAPBOX_KEY}`;
      const expectedGeocodeUrlDest = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedDest}.json?access_token=${MOCK_MAPBOX_KEY}`;
      const expectedGeocodeUrlWp = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedWp}.json?access_token=${MOCK_MAPBOX_KEY}`;
      const expectedDirectionsUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${originCoords[0]},${originCoords[1]};${wpCoords[0]},${wpCoords[1]};${destCoords[0]},${destCoords[1]}?alternatives=true&geometries=geojson&overview=full&steps=true&access_token=${MOCK_MAPBOX_KEY}`;

      it('should return 400 if origin or destination are missing in the body', async () => {
        let req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'navigation', destination: destination, mode: mode }),
        });
        await POST(req); // Call handler
        // Assert on captured response
        expect(capturedResponse?.status).toBe(400);
        expect(capturedResponse?.body).toEqual({ error: 'Origin and destination are required' });

        req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'navigation', origin: origin, mode: mode }),
        });
        await POST(req); // Call handler
        // Assert on captured response
        expect(capturedResponse?.status).toBe(400);
        expect(capturedResponse?.body).toEqual({ error: 'Origin and destination are required' });
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should successfully get directions using POST body parameters', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] }); // Geocode Origin
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] }); // Geocode Destination
        mockFetchResponse({ features: [{ geometry: { coordinates: wpCoords } }] }); // Geocode Waypoint
        mockFetchResponse(MOCK_DIRECTIONS_SUCCESS_RESPONSE); // Directions

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST',
          body: JSON.stringify({ action: 'navigation', origin, destination, mode, waypoints }),
        });
        await POST(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(4); // 1 origin + 1 dest + 1 waypoint + 1 directions
        expect(fetch).toHaveBeenNthCalledWith(1, expectedGeocodeUrlOrigin); // Geocode origin
        expect(fetch).toHaveBeenNthCalledWith(2, expectedGeocodeUrlDest);
        expect(fetch).toHaveBeenNthCalledWith(3, expectedGeocodeUrlWp); // Geocode waypoint
        expect(fetch).toHaveBeenNthCalledWith(4, expect.stringContaining('/directions/v5/mapbox/walking/')); // Directions call

        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toHaveProperty('routes');
        expect(capturedResponse?.body.mode).toBe(mode);
        const cacheKey = `navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`;
        expect(cache.has(cacheKey)).toBe(true);
      });

      it('should use default mode (driving) and empty waypoints if not provided', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] }); // Geocode Origin
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] }); // Geocode Destination
        mockFetchResponse(MOCK_DIRECTIONS_SUCCESS_RESPONSE); // Directions

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST',
          body: JSON.stringify({ action: 'navigation', origin, destination }), // No mode or waypoints
        });
        await POST(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(3); // 1 origin + 1 dest + 1 directions
        expect(fetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/directions/v5/mapbox/driving/')); // Default mode

        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toHaveProperty('routes');
        expect(capturedResponse?.body.mode).toBe('driving'); // Check default mode
        const cacheKey = `navigation:${origin}:${destination}:driving:`; // Default cache key
        expect(cache.has(cacheKey)).toBe(true);
      });

      it('should return cached navigation result via POST', async () => {
        const cacheKey = `navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`;
        const cachedData = { routes: [{ id: 'cached_route_post' }], mode: mode };
        cache.set(cacheKey, cachedData);

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST',
          body: JSON.stringify({ action: 'navigation', origin, destination, mode, waypoints }),
        });
        await POST(req); // Call the handler

        expect(fetch).not.toHaveBeenCalled();
        // Assert on the captured response data
        expect(capturedResponse?.status).toBe(200);
        expect(capturedResponse?.body).toEqual(cachedData);
      });

      it('should return 500 if Mapbox directions API fails via POST', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] }); // Geocode Origin OK
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] }); // Geocode Destination OK
        // Mock directions fetch to throw an error
        (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Directions Network Fail'));


        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST',
          body: JSON.stringify({ action: 'navigation', origin, destination, mode: 'cycling' }), // No waypoints
        });
        await POST(req); // Call the handler

        expect(fetch).toHaveBeenCalledTimes(3); // 2 geocode + 1 failed directions
        // Assert on the captured response data (from the catch block)
        expect(capturedResponse?.status).toBe(500);
        expect(capturedResponse?.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.size).toBe(0); // No cache on error
      });
    });

    it('should return 400 for invalid action in POST body', async () => {
      const req = createMockRequest('http://localhost/api/mapbox', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid_action', data: 'test' }),
      });
      await POST(req); // Call the handler

      // Assert on the captured response data
      expect(capturedResponse?.status).toBe(400);
      expect(capturedResponse?.body).toEqual({ error: 'Invalid action specified' });
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
