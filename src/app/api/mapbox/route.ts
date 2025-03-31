import { NextRequest, NextResponse } from 'next/server';

const MAPBOX_BASE_URL = 'https://api.mapbox.com';
const GEOCODING_ENDPOINT = '/geocoding/v5/mapbox.places';
const DIRECTIONS_ENDPOINT = '/directions/v5/mapbox';

const NAVIGATION_PROFILES = {
  driving: 'mapbox/driving',
  walking: 'mapbox/walking',
  cycling: 'mapbox/cycling',
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

const cache = new Map<string, any>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!process.env.MAPBOX_KEY) {
    return NextResponse.json(
      { error: 'Mapbox API key is not configured' },
      { status: 500 }
    );
  }

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
        
        const cachedResult = cache.get(`geocode:${address}`);
        if (cachedResult) {
          return NextResponse.json(cachedResult);
        }
        
        const result = await geocodeAddress(address);
        cache.set(`geocode:${address}`, result);
        return NextResponse.json(result);
      }
      
      case 'navigation': {
        const origin = searchParams.get('origin');
        const destination = searchParams.get('destination');
        const mode = searchParams.get('mode') as 'driving' | 'walking' | 'cycling' || 'driving';
        
        if (!origin || !destination) {
          return NextResponse.json(
            { error: 'Origin and destination parameters are required' },
            { status: 400 }
          );
        }
        
        const waypointsParam = searchParams.get('waypoints');
        const waypoints = waypointsParam ? waypointsParam.split('|') : [];
        
        const cachedResult = cache.get(`navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`);
        if (cachedResult) {
          return NextResponse.json(cachedResult);
        }
        
        const result = await getDirections(origin, destination, mode, waypoints);
        cache.set(`navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`, result);
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json({
          mapboxKey: process.env.MAPBOX_KEY,
          message: 'Use this token for client-side map rendering'
        });
    }
  } catch (error) {
    console.error('Mapbox API error:', error);
    return NextResponse.json(
      { error: 'Error processing mapbox request' },
      { status: 500 }
    );
  }
}

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
        
        const results = await Promise.all(
          addresses.map(async (address) => {
            const cachedResult = cache.get(`geocode:${address}`);
            if (cachedResult) {
              return cachedResult;
            }
            
            const result = await geocodeAddress(address);
            cache.set(`geocode:${address}`, result);
            return result;
          })
        );
        
        return NextResponse.json({ results });
      }
      
      case 'navigation': {
        const { origin, destination, mode = 'driving', waypoints = [] } = body as NavigationRequest;
        
        if (!origin || !destination) {
          return NextResponse.json(
            { error: 'Origin and destination are required' },
            { status: 400 }
          );
        }
        
        const cachedResult = cache.get(`navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`);
        if (cachedResult) {
          return NextResponse.json(cachedResult);
        }
        
        const result = await getDirections(origin, destination, mode, waypoints);
        cache.set(`navigation:${origin}:${destination}:${mode}:${waypoints.join('|')}`, result);
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Mapbox API error:', error);
    return NextResponse.json(
      { error: 'Error processing mapbox request' },
      { status: 500 }
    );
  }
}

async function geocodeAddress(address: string) {
  const encodedAddress = encodeURIComponent(address);
  const url = `${MAPBOX_BASE_URL}${GEOCODING_ENDPOINT}/${encodedAddress}.json?access_token=${process.env.MAPBOX_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
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

async function getDirections(
  origin: string,
  destination: string,
  mode: 'driving' | 'walking' | 'cycling' = 'driving',
  waypoints: string[] = []
) {
  const originCoords = await geocodeAddress(origin);
  const destinationCoords = await geocodeAddress(destination);
  
  const waypointCoords = waypoints.length > 0 
    ? await Promise.all(waypoints.map(wp => geocodeAddress(wp)))
    : [];
  
  const originPoint = originCoords.features[0]?.coordinates;
  const destPoint = destinationCoords.features[0]?.coordinates;
  
  if (!originPoint || !destPoint) {
    throw new Error('Could not geocode origin or destination addresses');
  }
  
  let coordinatesStr = `${originPoint[0]},${originPoint[1]}`;
  
  for (const wp of waypointCoords) {
    const wpPoint = wp.features[0]?.coordinates;
    if (wpPoint) {
      coordinatesStr += `;${wpPoint[0]},${wpPoint[1]}`;
    }
  }
  
  coordinatesStr += `;${destPoint[0]},${destPoint[1]}`;
  
  const profile = NAVIGATION_PROFILES[mode] || NAVIGATION_PROFILES.driving;
  
  const url = `${MAPBOX_BASE_URL}${DIRECTIONS_ENDPOINT}/${profile}/${coordinatesStr}?alternatives=true&geometries=geojson&overview=full&steps=true&access_token=${process.env.MAPBOX_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Directions error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
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
      name: destination,
      coordinates: destPoint,
    },
    mode,
  };
}