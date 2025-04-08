import { GET, POST } from '../../../../src/app/api/mapbox/route';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { clearMapboxCacheForTesting } from '@/lib/mapboxCache';

// We will spy on NextResponse.json instead of mocking it globally
import * as NextResponseModule from 'next/server';

// Mock global fetch
global.fetch = jest.fn();

const mockFetch = (response: any, ok = true, status = 200) => {
  const responseBody = JSON.stringify(response); // Stringify for text()
  return jest.fn().mockResolvedValueOnce({
    ok,
    json: jest.fn().mockResolvedValueOnce(response),
    text: jest.fn().mockResolvedValueOnce(responseBody), // Mock text()
    statusText: ok ? 'OK' : `Error ${status}`,
    status: ok ? status : status,
  });
};

// Mock console.error to avoid cluttering test output
console.error = jest.fn();

describe('Mapbox API Route', () => {
  const originalMapboxKey = process.env.MAPBOX_KEY;

  beforeEach(() => {
    jest.clearAllMocks(); // Clears fetch mocks
    // Restore any spies if they were created in tests
    jest.restoreAllMocks();
    // Clear the internal cache before each test
    clearMapboxCacheForTesting();
    
    process.env.MAPBOX_KEY = 'test-mapbox-key'; // Set a mock key for tests
  });

  afterAll(() => {
    process.env.MAPBOX_KEY = originalMapboxKey; // Restore original key
  });

  describe('GET Handler', () => {
    it('should return Mapbox key if no action specified', async () => {
      const request = { url: 'http://localhost/api/mapbox' } as NextRequest; // Simulate NextRequest
      const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
      const response = await GET(request);

      expect(jsonSpy).toHaveBeenCalledWith(
        { mapboxKey: 'test-mapbox-key', message: 'Use this token for client-side map rendering' }
      );
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.mapboxKey).toBe('test-mapbox-key');
    });

    it('should return 500 if MAPBOX_KEY is not set', async () => {
      delete process.env.MAPBOX_KEY;
      const request = { url: 'http://localhost/api/mapbox?action=geocode&address=test' } as NextRequest; // Simulate NextRequest
      const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
      const response = await GET(request);

      expect(jsonSpy).toHaveBeenCalledWith(
        { error: 'Mapbox API key is not configured' },
        { status: 500 }
      );
      expect(response.status).toBe(500);
    });

    describe('action=geocode', () => {
      it('should geocode address successfully', async () => {
        const mockGeocodeResponse = {
          features: [{ id: 'place.123', place_name: 'Test Location', geometry: { coordinates: [-74, 40] }, place_type: ['place'], relevance: 1 }],
        };
        (global.fetch as jest.Mock).mockImplementationOnce(mockFetch(mockGeocodeResponse));

        const request = { url: 'http://localhost/api/mapbox?action=geocode&address=Test%20Location' } as NextRequest; // Simulate NextRequest
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await GET(request);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('https://api.mapbox.com/geocoding/v5/mapbox.places/Test%20Location.json?access_token=test-mapbox-key')
        );
        expect(jsonSpy).toHaveBeenCalledWith(
          {
            query: 'Test Location',
            features: [{ id: 'place.123', place_name: 'Test Location', coordinates: [-74, 40], place_type: ['place'], relevance: 1 }],
          }
        );
        expect(response.status).toBe(200);
      });

      it('should return 400 if address parameter is missing', async () => {
        const request = { url: 'http://localhost/api/mapbox?action=geocode' } as NextRequest; // Simulate NextRequest
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await GET(request);

        expect(jsonSpy).toHaveBeenCalledWith(
          { error: 'Address parameter is required' },
          { status: 400 }
        );
        expect(response.status).toBe(400);
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should return 500 if Mapbox geocoding fails', async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(mockFetch({ message: 'Geocoding Error' }, false, 500));

        const request = { url: 'http://localhost/api/mapbox?action=geocode&address=Error%20Location' } as NextRequest; // Simulate NextRequest
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await GET(request);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(jsonSpy).toHaveBeenCalledWith(
          // Expect the specific error message based on mockFetch statusText
          { error: 'Geocoding error: Error 500' },
          { status: 500 }
        );
        expect(response.status).toBe(500);
      });
    });

    describe('action=navigation', () => {
        const mockGeocodeOriginResponse = { features: [{ geometry: { coordinates: [-74, 40] } }] };
        const mockGeocodeDestResponse = { features: [{ geometry: { coordinates: [-75, 41] } }] };
        const mockDirectionsResponse = {
          routes: [{ distance: 1000, duration: 100, geometry: {}, legs: [{ steps: [] }] }],
          waypoints: [],
        };

      it('should get navigation directions successfully', async () => {
        (global.fetch as jest.Mock)
          .mockImplementationOnce(mockFetch(mockGeocodeOriginResponse)) // Geocode origin
          .mockImplementationOnce(mockFetch(mockGeocodeDestResponse)) // Geocode destination
          .mockImplementationOnce(mockFetch(mockDirectionsResponse)); // Get directions

        const request = { url: 'http://localhost/api/mapbox?action=navigation&origin=Origin&destination=Destination&mode=driving' } as NextRequest; // Simulate NextRequest
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await GET(request);

        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(global.fetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/geocoding/v5/mapbox.places/Origin.json'));
        expect(global.fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/geocoding/v5/mapbox.places/Destination.json'));
        expect(global.fetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/directions/v5/mapbox/driving/-74,40;-75,41?')); // Removed extra /mapbox

        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            routes: expect.any(Array),
            origin: { name: 'Origin', coordinates: [-74, 40] },
            destination: { name: 'Destination', coordinates: [-75, 41] },
            mode: 'driving',
          })
        );
        expect(response.status).toBe(200);
      });

      it('should return 400 if origin or destination is missing', async () => {
        const request = { url: 'http://localhost/api/mapbox?action=navigation&origin=Origin' } as NextRequest; // Simulate NextRequest
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await GET(request);

        expect(jsonSpy).toHaveBeenCalledWith(
          // Match the actual error message from the route
          { error: 'Origin address and either destination address or destination coordinates are required' },
          { status: 400 }
        );
        expect(response.status).toBe(400);
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should return 500 if Mapbox navigation fails (e.g., geocoding fails)', async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(mockFetch({}, false, 500)); // Fail geocoding origin

        const request = { url: 'http://localhost/api/mapbox?action=navigation&origin=ErrorOrigin&destination=Destination' } as NextRequest; // Simulate NextRequest
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await GET(request);

        expect(global.fetch).toHaveBeenCalledTimes(1); // Only geocode origin called
        expect(jsonSpy).toHaveBeenCalledWith(
          // Expect the specific error message based on mockFetch statusText
          { error: 'Geocoding error: Error 500' },
          { status: 500 }
        );
        expect(response.status).toBe(500);
      });
    });
  });

  describe('POST Handler', () => {
    it('should return 500 if MAPBOX_KEY is not set', async () => {
      delete process.env.MAPBOX_KEY;
      const request = { // Simulate NextRequest
        url: 'http://localhost/api/mapbox',
        method: 'POST',
        json: async () => ({ action: 'geocode', addresses: ['test'] }),
      } as NextRequest;
      const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
      const response = await POST(request);

      expect(jsonSpy).toHaveBeenCalledWith(
        { error: 'Mapbox API key is not configured' },
        { status: 500 }
      );
      expect(response.status).toBe(500);
    });

    it('should return 400 for invalid action', async () => {
      const request = { // Simulate NextRequest
        url: 'http://localhost/api/mapbox',
        method: 'POST',
        json: async () => ({ action: 'invalid' }),
      } as NextRequest;
      const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
      const response = await POST(request);
      expect(jsonSpy).toHaveBeenCalledWith(
        { error: 'Invalid action specified' },
        { status: 400 }
      );
      expect(response.status).toBe(400);
    });

    describe('action=geocode', () => {
      const mockGeocodeResponse1 = { features: [{ id: 'place.1', place_name: 'Addr 1', geometry: { coordinates: [1, 1] } }] };
      const mockGeocodeResponse2 = { features: [{ id: 'place.2', place_name: 'Addr 2', geometry: { coordinates: [2, 2] } }] };

      it('should batch geocode addresses successfully', async () => {
        (global.fetch as jest.Mock)
          .mockImplementationOnce(mockFetch(mockGeocodeResponse1))
          .mockImplementationOnce(mockFetch(mockGeocodeResponse2));

        const request = { // Simulate NextRequest
          url: 'http://localhost/api/mapbox',
          method: 'POST',
          json: async () => ({ action: 'geocode', addresses: ['Addr 1', 'Addr 2'] }),
        } as NextRequest;
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await POST(request);

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/geocoding/v5/mapbox.places/Addr%201.json'));
        expect(global.fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/geocoding/v5/mapbox.places/Addr%202.json'));

        expect(jsonSpy).toHaveBeenCalledWith(
          {
            results: [
              expect.objectContaining({ query: 'Addr 1' }),
              expect.objectContaining({ query: 'Addr 2' }),
            ],
          }
        );
        expect(response.status).toBe(200);
      });

      it('should return 400 if addresses array is missing or invalid', async () => {
        const request = { // Simulate NextRequest
          url: 'http://localhost/api/mapbox',
          method: 'POST',
          json: async () => ({ action: 'geocode', addresses: [] }), // Empty array
        } as NextRequest;
        let jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        let response = await POST(request);
        expect(jsonSpy).toHaveBeenCalledWith(
          { error: 'Valid addresses array is required' },
          { status: 400 }
        );
        expect(response.status).toBe(400);

        const request2 = { // Simulate NextRequest
          url: 'http://localhost/api/mapbox',
          method: 'POST',
          json: async () => ({ action: 'geocode' }), // Missing addresses
        } as NextRequest;
        jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json'); // Re-spy for the new call
        response = await POST(request2);
        expect(jsonSpy).toHaveBeenCalledWith(
          { error: 'Valid addresses array is required' },
          { status: 400 }
        );
        expect(response.status).toBe(400);
      });

      it('should return 200 with error details if any Mapbox geocoding fails', async () => {
        (global.fetch as jest.Mock)
          .mockImplementationOnce(mockFetch(mockGeocodeResponse1)) // Success for Addr 1
          .mockImplementationOnce(mockFetch({}, false, 500)); // Fail for Error Addr

        const request = { // Simulate NextRequest
          url: 'http://localhost/api/mapbox',
          method: 'POST',
          json: async () => ({ action: 'geocode', addresses: ['Addr 1', 'Error Addr'] }),
        } as NextRequest;
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await POST(request);

        expect(global.fetch).toHaveBeenCalledTimes(2);
        // Expect a 200 OK because Promise.allSettled handles individual errors
        expect(response.status).toBe(200);
        expect(jsonSpy).toHaveBeenCalledWith({
          results: [
            // First result should be successful
            expect.objectContaining({ query: 'Addr 1', features: expect.any(Array) }),
            // Second result should contain the error details.
            // The error thrown by geocodeAddress should be caught by allSettled.
            expect.objectContaining({
              query: 'Error Addr',
              features: [],
              error: 'Geocoding error: Error 500' // Expect specific error from geocodeAddress via reason.message
            }),
          ],
        });
      });
    });

    describe('action=navigation', () => {
        const mockGeocodeOriginResponse = { features: [{ geometry: { coordinates: [-74, 40] } }] };
        const mockGeocodeDestResponse = { features: [{ geometry: { coordinates: [-75, 41] } }] };
        const mockDirectionsResponse = {
          routes: [{ distance: 1000, duration: 100, geometry: {}, legs: [{ steps: [] }] }],
          waypoints: [],
        };

      it('should get navigation directions successfully', async () => {
        (global.fetch as jest.Mock)
          .mockImplementationOnce(mockFetch(mockGeocodeOriginResponse)) // Geocode origin
          .mockImplementationOnce(mockFetch(mockGeocodeDestResponse)) // Geocode destination
          .mockImplementationOnce(mockFetch(mockDirectionsResponse)); // Get directions

        const request = { // Simulate NextRequest
          url: 'http://localhost/api/mapbox',
          method: 'POST',
          json: async () => ({ action: 'navigation', origin: 'Origin', destination: 'Destination', mode: 'walking' }),
        } as NextRequest;
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await POST(request);

        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({ mode: 'walking' })
        );
        expect(response.status).toBe(200);
      });

      it('should return 400 if origin or destination is missing', async () => {
        const request = { // Simulate NextRequest
          url: 'http://localhost/api/mapbox',
          method: 'POST',
          json: async () => ({ action: 'navigation', origin: 'Origin Only' }),
        } as NextRequest;
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await POST(request);

        expect(jsonSpy).toHaveBeenCalledWith(
          { error: 'Origin and destination are required' },
          { status: 400 }
        );
        expect(response.status).toBe(400);
      });

      it('should return 500 if Mapbox navigation fails', async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(mockFetch({}, false, 500)); // Fail geocoding

        const request = { // Simulate NextRequest
          url: 'http://localhost/api/mapbox',
          method: 'POST',
          json: async () => ({ action: 'navigation', origin: 'ErrorOrigin', destination: 'Destination' }),
        } as NextRequest;
        const jsonSpy = jest.spyOn(NextResponseModule.NextResponse, 'json');
        const response = await POST(request);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(jsonSpy).toHaveBeenCalledWith(
          // Expect the specific error message based on mockFetch statusText
          { error: 'Geocoding error: Error 500' },
          { status: 500 }
        );
        expect(response.status).toBe(500);
      });
    });
  });
});
