import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, cache } from '../../../../src/app/api/mapbox/route';
import type { ResponseInit } from 'node-fetch'; // Import ResponseInit if needed, or use built-in

type MockResponse = {
  status: number;
  body: any;
};

const mockJson = jest.fn();
const mockNextResponse = {
  json: mockJson,
};
jest.mock('next/server', () => ({
  NextResponse: {
    json: (...args: [body?: any, init?: ResponseInit]) => mockNextResponse.json(...args), // Correctly typed args
  },
  NextRequest: jest.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
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
      url: url.toString(),
      ...(init ?? {}), // Handle potentially undefined init
      json: jest.fn().mockImplementation(mockJsonImplementation),
      searchParams: new URL(url.toString()).searchParams,
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

const createMockRequest = (url: string, options?: RequestInit): NextRequest => {
  return new NextRequest(url, options) as unknown as NextRequest;
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
    // Type the options parameter correctly
    mockJson.mockImplementation((body: any, options?: ResponseInit) => ({
      status: options?.status ?? 200,
      body,
    }));
  });

  afterAll(() => {
    process.env.MAPBOX_KEY = originalMapboxKey;
    jest.restoreAllMocks();
  });

  describe('API Key Check', () => {
    it('GET should return 500 if MAPBOX_KEY is not set', async () => {
      delete process.env.MAPBOX_KEY;
      const req = createMockRequest('http://localhost/api/mapbox?action=geocode&address=test');
      // Explicitly type the response according to the mock structure
      const response: MockResponse = await GET(req);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Mapbox API key is not configured' });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('POST should return 500 if MAPBOX_KEY is not set', async () => {
      delete process.env.MAPBOX_KEY;
      const req = createMockRequest('http://localhost/api/mapbox', {
        method: 'POST',
        body: JSON.stringify({ action: 'geocode', addresses: ['test'] }),
      });
      // Explicitly type the response according to the mock structure
      const response: MockResponse = await POST(req);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Mapbox API key is not configured' });
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/mapbox', () => {
    it('should return the Mapbox key hint for the default action', async () => {
      const req = createMockRequest('http://localhost/api/mapbox');
      // Explicitly type the response according to the mock structure
      const response: MockResponse = await GET(req);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
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
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Address parameter is required' });
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should successfully geocode an address', async () => {
        mockFetchResponse(MOCK_GEOCODE_SUCCESS_RESPONSE);
        const req = createMockRequest(`http://localhost/api/mapbox?action=geocode&address=${encodedAddress}`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(expectedUrl);
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          query: testAddress,
          features: MOCK_GEOCODE_SUCCESS_RESPONSE.features.map((f: any) => ({
            id: f.id,
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
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body).toEqual(cachedData);
        expect(cache.size).toBe(1);
      });

      it('should return 500 if Mapbox geocoding API fails', async () => {
        mockFetchResponse({ message: 'API Error' }, false, 500, 'Server Error');
        const req = createMockRequest(`http://localhost/api/mapbox?action=geocode&address=${encodedAddress}`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(expectedUrl);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.size).toBe(0);
      });

      it('should return 500 if fetch throws an error', async () => {
        mockFetchError();
        const req = createMockRequest(`http://localhost/api/mapbox?action=geocode&address=${encodedAddress}`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Error processing mapbox request' });
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
        // Explicitly type the response according to the mock structure
        let response: MockResponse = await GET(req);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Origin and destination parameters are required' });

        req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&mode=${mode}`);
        response = await GET(req);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Origin and destination parameters are required' });
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should successfully get directions with origin, destination, and mode', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] });
        mockFetchResponse(MOCK_DIRECTIONS_SUCCESS_RESPONSE);

        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=driving`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch).toHaveBeenNthCalledWith(1, expect.stringContaining(encodedOrigin));
        expect(fetch).toHaveBeenNthCalledWith(2, expect.stringContaining(encodedDest));
        expect(fetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/mapbox/driving/'));
        expect(fetch).toHaveBeenNthCalledWith(3, expect.stringContaining(`${originCoords.join(',')};${destCoords.join(',')}`));

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('routes');
        expect(response.body).toHaveProperty('waypoints');
        expect(response.body.mode).toBe('driving');
        expect(response.body.origin.name).toBe(origin);
        expect(response.body.destination.name).toBe(destination);
        expect(cache.has(`navigation:${origin}:${destination}:driving:`)).toBe(true);
      });

      it('should successfully get directions with waypoints', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: wp1Coords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: wp2Coords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] });
        mockFetchResponse(MOCK_DIRECTIONS_SUCCESS_RESPONSE);

        const waypointsQuery = waypoints.map(encodeURIComponent).join('|');
        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=${mode}&waypoints=${waypointsQuery}`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).toHaveBeenCalledTimes(5);
        expect(fetch).toHaveBeenNthCalledWith(1, expectedGeocodeUrlOrigin);
        expect(fetch).toHaveBeenNthCalledWith(2, expectedGeocodeUrlDest);
        expect(fetch).toHaveBeenNthCalledWith(3, expectedGeocodeUrlWp1);
        expect(fetch).toHaveBeenNthCalledWith(4, expectedGeocodeUrlWp2);
        expect(fetch).toHaveBeenNthCalledWith(5, expectedDirectionsUrl);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('routes');
        expect(response.body.mode).toBe(mode);
        const cacheKey = `navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`;
        expect(cache.has(cacheKey)).toBe(true);
      });

      it('should return cached navigation result', async () => {
        const cacheKey = `navigation:${origin}:${destination}:walking:`;
        const cachedData = { routes: [{ id: 'cached_route' }], mode: 'walking' };
        cache.set(cacheKey, cachedData);

        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=walking`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body).toEqual(cachedData);
      });

      it('should return 500 if Mapbox geocoding fails during navigation', async () => {
        mockFetchResponse({ message: 'Geocode Fail' }, false, 404);
        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=driving`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.size).toBe(0);
      });

      it('should return 500 if Mapbox directions API fails', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] });
        mockFetchResponse({ message: 'Directions Fail' }, false, 500);

        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=driving`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.size).toBe(0);
      });

      it('should return 500 if geocoding does not return coordinates', async () => {
        mockFetchResponse({ features: [] });
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] });

        const req = createMockRequest(`http://localhost/api/mapbox?action=navigation&origin=${encodedOrigin}&destination=${encodedDest}&mode=driving`);
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await GET(req);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Error processing mapbox request' });
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
        // Explicitly type the response according to the mock structure
        let response: MockResponse = await POST(req);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Valid addresses array is required' });

        req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: 'not-an-array' })
        });
        response = await POST(req);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Valid addresses array is required' });

        req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: [] })
        });
        response = await POST(req);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Valid addresses array is required' });
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should successfully geocode multiple addresses', async () => {
        const result1 = { features: [{ id: 'place.1' }] };
        const result2 = { features: [{ id: 'place.2' }] };
        mockFetchResponse(result1);
        mockFetchResponse(result2);

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: addresses }),
        });
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await POST(req);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenNthCalledWith(1, expectedUrl1);
        expect(fetch).toHaveBeenNthCalledWith(2, expectedUrl2);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('results');
        expect(response.body.results).toHaveLength(2);
        expect(response.body.results[0].query).toBe(addresses[0]);
        expect(response.body.results[1].query).toBe(addresses[1]);
        expect(cache.size).toBe(2);
        expect(cache.has(`geocode:${addresses[0]}`)).toBe(true);
        expect(cache.has(`geocode:${addresses[1]}`)).toBe(true);
      });

      it('should use cached results and fetch non-cached addresses', async () => {
        const cachedResult = { query: addresses[0], features: [{ id: 'cached' }] };
        cache.set(`geocode:${addresses[0]}`, cachedResult);

        const freshResult = { features: [{ id: 'place.2' }] };
        mockFetchResponse(freshResult);

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: addresses }),
        });
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await POST(req);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(expectedUrl2);
        expect(response.status).toBe(200);
        expect(response.body.results).toHaveLength(2);
        expect(response.body.results[0]).toEqual(cachedResult);
        expect(response.body.results[1].query).toBe(addresses[1]);
        expect(cache.size).toBe(2);
      });

      it('should return 500 if any Mapbox geocoding API call fails (Promise.all rejection)', async () => {
        mockFetchResponse({ features: [{ id: 'place.1' }] });
        mockFetchResponse({ message: 'API Error' }, false, 500);

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'geocode', addresses: addresses }),
        });
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await POST(req);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.has(`geocode:${addresses[0]}`)).toBe(true);
        expect(cache.has(`geocode:${addresses[1]}`)).toBe(false);
      });

      it('should return 500 if request body is invalid JSON', async () => {
        const invalidJsonBody = "{ action: 'geocode', addresses: ['test' ";
        (NextRequest as unknown as jest.Mock).mockImplementationOnce((url: string | URL, init?: RequestInit) => ({
          url: url.toString(),
          ...(init ?? {}),
          json: jest.fn<() => Promise<any>>().mockRejectedValue(new SyntaxError('Unexpected token...')),
          searchParams: new URL(url.toString()).searchParams,
        }));

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: invalidJsonBody,
        });

        const response: MockResponse = await POST(req);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Error processing mapbox request' });
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
        // Explicitly type the response according to the mock structure
        let response: MockResponse = await POST(req);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Origin and destination are required' });

        req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST', body: JSON.stringify({ action: 'navigation', origin: origin, mode: mode }),
        });
        response = await POST(req);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Origin and destination are required' });
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should successfully get directions using POST body parameters', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: wpCoords } }] });
        mockFetchResponse(MOCK_DIRECTIONS_SUCCESS_RESPONSE);

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST',
          body: JSON.stringify({ action: 'navigation', origin, destination, mode, waypoints }),
        });
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await POST(req);

        expect(fetch).toHaveBeenCalledTimes(4);
        expect(fetch).toHaveBeenNthCalledWith(1, expectedGeocodeUrlOrigin);
        expect(fetch).toHaveBeenNthCalledWith(2, expectedGeocodeUrlDest);
        expect(fetch).toHaveBeenNthCalledWith(3, expectedGeocodeUrlWp);
        expect(fetch).toHaveBeenNthCalledWith(4, expectedDirectionsUrl);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('routes');
        expect(response.body.mode).toBe(mode);
        const cacheKey = `navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`;
        expect(cache.has(cacheKey)).toBe(true);
      });

      it('should use default mode (driving) and empty waypoints if not provided', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] });
        mockFetchResponse(MOCK_DIRECTIONS_SUCCESS_RESPONSE);

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST',
          body: JSON.stringify({ action: 'navigation', origin, destination }),
        });
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await POST(req);

        const expectedDefaultDirectionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?alternatives=true&geometries=geojson&overview=full&steps=true&access_token=${MOCK_MAPBOX_KEY}`;

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch).toHaveBeenNthCalledWith(3, expectedDefaultDirectionsUrl);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('routes');
        expect(response.body.mode).toBe('driving');
        const cacheKey = `navigation:${origin}:${destination}:driving:`;
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
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await POST(req);

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(response.body).toEqual(cachedData);
      });

      it('should return 500 if Mapbox directions API fails via POST', async () => {
        mockFetchResponse({ features: [{ geometry: { coordinates: originCoords } }] });
        mockFetchResponse({ features: [{ geometry: { coordinates: destCoords } }] });
        mockFetchError(new Error('Directions Network Fail'));

        const req = createMockRequest('http://localhost/api/mapbox', {
          method: 'POST',
          body: JSON.stringify({ action: 'navigation', origin, destination, mode: 'cycling' }),
        });
        // Explicitly type the response according to the mock structure
        const response: MockResponse = await POST(req);

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Error processing mapbox request' });
        expect(cache.size).toBe(0);
      });
    });

    it('should return 400 for invalid action in POST body', async () => {
      const req = createMockRequest('http://localhost/api/mapbox', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid_action', data: 'test' }),
      });
      // Explicitly type the response according to the mock structure
      const response: MockResponse = await POST(req);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid action specified' });
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});