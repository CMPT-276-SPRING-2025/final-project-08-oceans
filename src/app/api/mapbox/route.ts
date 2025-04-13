import { NextRequest, NextResponse } from 'next/server';
import { mapboxCache } from '@/lib/mapboxCache';

const MAPBOX_BASE_URL = 'https://api.mapbox.com';
const GEOCODING_ENDPOINT = '/geocoding/v5/mapbox.places';
const DIRECTIONS_ENDPOINT = '/directions/v5/mapbox';
const STATIC_IMAGE_ENDPOINT = '/styles/v1/mapbox/streets-v11/static';

// Types for navigation profiles
const NAVIGATION_PROFILES = {
  driving: 'driving', 
  walking: 'walking', 
  cycling: 'cycling', 
};

type GeocodeRequest = {
  addresses: string[];
};

type NavigationRequest = {
  origin: string;
  destination: string;
  mode: 'driving' | 'walking' | 'cycling';
  waypoints?: string[];
};

/**
 * Handles various actions related to Mapbox API requests, including geocoding, navigation, and static map generation.
 * @param request - The request object containing the HTTP request information.
 * @returns {Promise<NextResponse>} A promise that resolves to the NextResponse object containing the result of the action.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  //If key is not configured, return error
  if (!process.env.MAPBOX_KEY) {
    return NextResponse.json(
      { error: 'Mapbox API key is not configured' },
      { status: 500 }
    );
  }

  // Tries to handle the request based on the action specified in the query parameters.
  try {

    switch (action) {
      case 'geocode': {
        const address = searchParams.get('address');
        if (!address) {
          return NextResponse.json(
            { error: 'Address parameter is required' },
            { status: 400 }
          );
        }
        
        // Check if the address is already cached
        const cachedResult = mapboxCache.get(`geocode:${address}`);
        if (cachedResult) {
          return NextResponse.json(cachedResult);
        }
        
        const result = await geocodeAddress(address);
        mapboxCache.set(`geocode:${address}`, result);
        return NextResponse.json(result);
      }
      
      // Handle navigation requests
      // Requires origin address and either destination address or coordinates
      case 'navigation': {
        const origin = searchParams.get('origin'); 
        const destination = searchParams.get('destination'); 
        const destinationCoordsParam = searchParams.get('destinationCoords');
        const destinationName = searchParams.get('destinationName'); 
        const mode = searchParams.get('mode') as 'driving' | 'walking' | 'cycling' || 'driving';
        
        // Require origin address AND (destination address OR destination coordinates)
        if (!origin || (!destination && !destinationCoordsParam)) {
          return NextResponse.json(
            { error: 'Origin address and either destination address or destination coordinates are required' },
            { status: 400 }
          );
        }
        
        const waypointsParam = searchParams.get('waypoints');
        const waypoints = waypointsParam ? waypointsParam.split('|') : [];
        
        // Use destinationCoordsParam if available, otherwise use destination address
        const destinationIdentifier = destinationCoordsParam || destination!;
        const cachedResult = mapboxCache.get(`navigation:${origin}:${destinationIdentifier}:${mode}:${waypoints.join('|')}`);
        if (cachedResult) {
          return NextResponse.json(cachedResult);
        }
        
        // result of getting directions
        const result = await getDirections(
          origin,
          destination, 
          mode,
          waypoints,
          undefined, 
          destinationCoordsParam,
          destinationName 
        );
        // Cache the result using the destinationIdentifier
        mapboxCache.set(`navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`, result);
        return NextResponse.json(result);
      }

      // Generates the static map URL based on the provided longitude, latitude, zoom level, and other parameters.
      // Returns a JSON response with the generated static map URL.
      case 'staticmap': {
        const lonStr = searchParams.get('lon');
        const latStr = searchParams.get('lat');
        const zoomStr = searchParams.get('zoom') || '14';
        const widthStr = searchParams.get('width') || '600';
        const heightStr = searchParams.get('height') || '400';
        const markerColor = searchParams.get('markerColor') || 'f97316';
        const markerSize = searchParams.get('markerSize') || 'm';

        if (!lonStr || !latStr) {
          return NextResponse.json(
            { error: 'Longitude and latitude parameters are required' },
            { status: 400 }
          );
        }

        const lon = parseFloat(lonStr);
        const lat = parseFloat(latStr);
        const zoom = parseInt(zoomStr, 10);
        const width = parseInt(widthStr, 10);
        const height = parseInt(heightStr, 10);

        if (isNaN(lon) || isNaN(lat) || isNaN(zoom) || isNaN(width) || isNaN(height)) {
          return NextResponse.json(
            { error: 'Invalid parameters' },
            { status: 400 }
          );
        }

        const cacheKey = `staticmap:${lon}:${lat}:${zoom}:${width}:${height}:${markerSize}:${markerColor}`;
        const cachedResult = mapboxCache.get(cacheKey);
        if (cachedResult) {
          return NextResponse.json(cachedResult);
        }

        const markerOverlay = `pin-${markerSize}-s+${markerColor}(${lon},${lat})`;

        const url = `${MAPBOX_BASE_URL}${STATIC_IMAGE_ENDPOINT}/${markerOverlay}/${lon},${lat},${zoom}/${width}x${height}@2x?access_token=${process.env.MAPBOX_KEY}&attribution=false&logo=false`;

        const result = { staticMapURL: url };
        mapboxCache.set(cacheKey, result);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({
          mapboxKey: process.env.MAPBOX_KEY,
          message: 'Use this token for client-side map rendering'
        });
    }
  } catch (error) {
    return NextResponse.json(
      // Return the specific error message
      { error: error.message || 'Error processing mapbox request' },
      { status: 500 }
    );
  }
}

/**
 * Fetches data from the Mapbox API based on the provided action.
 * @param request - The request object containing the HTTP request information.
 * @returns {Promise<NextResponse>} A promise that resolves to the NextResponse object containing the result of the action.
 */
export async function POST(request: NextRequest) {
  if (!process.env.MAPBOX_KEY) {
    return NextResponse.json(
      { error: 'Mapbox API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'geocode': {
        const { addresses } = body as GeocodeRequest;
        
        if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
          return NextResponse.json(
            { error: 'Valid addresses array is required' },
            { status: 400 }
          );
        }
        
        // Use Promise.allSettled to handle individual geocoding errors
        const settledResults = await Promise.allSettled(
          addresses.map(async (address) => {
            const cachedResult = mapboxCache.get(`geocode:${address}`);
            if (cachedResult) {
              return cachedResult; // Return cached result if available
            }
            
            const result = await geocodeAddress(address);
            mapboxCache.set(`geocode:${address}`, result);

            return result;
          })
        );

        // Process settled results: extract fulfilled values, log rejected reasons
        const results = settledResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value; // Successfully geocoded
          } else {
            return { query: addresses[index], features: [], error: result.reason?.message || 'Geocoding failed' };
          }
        });
        
        return NextResponse.json({ results });
      }
      
      // Handle navigation requests
      case 'navigation': {
        const { origin, destination, mode = 'driving', waypoints = [] } = body as NavigationRequest;
        
        if (!origin || !destination) {
          return NextResponse.json(
            { error: 'Origin and destination are required' },
            { status: 400 }
          );
        }
        
        const cachedResult = mapboxCache.get(`navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`);
        if (cachedResult) {
          return NextResponse.json(cachedResult);
        }
        
        const result = await getDirections(origin, destination, mode, waypoints);
        mapboxCache.set(`navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`, result);
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {

    return NextResponse.json(
      // Return the specific error message
      { error: error.message || 'Error processing mapbox request' },
      { status: 500 }
    );
  }
}

/**
 * Geocodes the provided address.
 * @param address - Address string to geocode
 * @returns {Promise<{ query: string; features: any[] }>} The geocoding result containing the query and features.
 */
async function geocodeAddress(address: string) {
  const encodedAddress = encodeURIComponent(address);
  const url = `${MAPBOX_BASE_URL}${GEOCODING_ENDPOINT}/${encodedAddress}.json?access_token=${process.env.MAPBOX_KEY}`;
  

  const response = await fetch(url);
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Geocoding error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    query: address,
    features: data.features.map((feature: any) => ({
      id: feature.id,
      place_name: feature.place_name,
      coordinates: feature.geometry.coordinates,
      place_type: feature.place_type,
      relevance: feature.relevance,
    })),
  };
}

/**
 * Fetches directions from the Mapbox Directions API based on the provided parameters.
 * @returns {Promise<any>} - The directions result containing route information.
 */
async function getDirections(
  origin: string, 
  destination: string | null,
  mode: 'driving' | 'walking' | 'cycling' = 'driving',
  waypoints: string[] = [],
  originCoordsParam?: string, 
  destinationCoordsParam?: string, 
  destinationName?: string | null
) {
  let originPoint: [number, number] | undefined;
  let destPoint: [number, number] | undefined;
  let finalDestinationName = destinationName || destination; 

  // Geocode origin or parse coords
  if (originCoordsParam) {
    const [lng, lat] = originCoordsParam.split(',').map(Number);
    if (!isNaN(lng) && !isNaN(lat)) {
      originPoint = [lng, lat];
    } else {
       throw new Error('Invalid origin coordinates format. Expected "longitude,latitude".');
    }
  } else {
    const originGeocodeResult = await geocodeAddress(origin);
    originPoint = originGeocodeResult.features[0]?.coordinates;
    if (!originPoint) throw new Error(`Could not geocode origin address: ${origin}`);
  }

  // Geocode destination or parse coords
  if (destinationCoordsParam) {
     const [lng, lat] = destinationCoordsParam.split(',').map(Number);

     // Check if the coordinates are valid numbers
     if (!isNaN(lng) && !isNaN(lat)) {
       destPoint = [lng, lat];
     } else {
        throw new Error('Invalid destination coordinates format. Expected "longitude,latitude".');
     }
  
  // If destinationName is provided, use it as the final destination name
  } else if (destination) {
     const destinationGeocodeResult = await geocodeAddress(destination);
     destPoint = destinationGeocodeResult.features[0]?.coordinates;
     if (!destPoint) throw new Error(`Could not geocode destination address: ${destination}`);
  } else {
     throw new Error('Destination address or coordinates are required.');
  }

  // Geocode waypoints 
  const waypointCoords = waypoints.length > 0
    ? await Promise.all(waypoints.map(wp => geocodeAddress(wp)))
    : [];
  
  let coordinatesStr = `${originPoint[0]},${originPoint[1]}`;
  
  // For each waypoint, add its coordinates to the string
  for (const wp of waypointCoords) {
    const wpPoint = wp.features[0]?.coordinates;
    if (wpPoint) {
      coordinatesStr += `;${wpPoint[0]},${wpPoint[1]}`;
    }
  }
  
  // Add the destination coordinates to the string
  coordinatesStr += `;${destPoint[0]},${destPoint[1]}`;
  const profile = NAVIGATION_PROFILES[mode] || NAVIGATION_PROFILES.driving;
  const url = `${MAPBOX_BASE_URL}${DIRECTIONS_ENDPOINT}/${profile}/${coordinatesStr}?alternatives=true&geometries=geojson&overview=full&steps=true&access_token=${process.env.MAPBOX_KEY}`;
  
  
  const response = await fetch(url);
  
  // Check if the response is OK 
  if (!response.ok) {
    let errorBody = '';
    let errorMessage = `Directions API Error: ${response.status}`;
    try {
      errorBody = await response.text(); 
      const parsedBody = JSON.parse(errorBody);
      // Prioritize message from parsed body
      if (parsedBody.message) {
        errorMessage += ` - ${parsedBody.message}`;
      } else if (response.statusText && response.statusText.toLowerCase() !== 'unknown') {
         // Fallback to statusText only if it's not 'Unknown' (case-insensitive)
         errorMessage += ` - ${response.statusText}`;
      }
    } catch (e) {
      // Ignore parsing errors, stick with default message or statusText (if not 'Unknown')
       if (response.statusText && response.statusText.toLowerCase() !== 'unknown') {
         errorMessage += ` - ${response.statusText}`;
       }
    }

    throw new Error(errorMessage); // Throw the more detailed error message
  }
  
  const data = await response.json();

  
  // Check for NoRoute code even in successful responses
  if (data.code === 'NoRoute') {
     throw new Error('Directions API Error: No route found');
  }
  
  return {
    routes: data.routes.map((route: any) => ({
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
      steps: route.legs.flatMap((leg: any) => 
        leg.steps.map((step: any) => ({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
          name: step.name,
          mode: step.mode,
        }))
      ),
    })),
    waypoints: data.waypoints,
    origin: {
      name: origin,
      coordinates: originPoint,
    },
    destination: {
      name: finalDestinationName, 
      coordinates: destPoint,
    },
    mode,
  };
}