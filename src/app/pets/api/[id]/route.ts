import { NextResponse } from 'next/server';

// Define authorization response type
type PetfinderAuthResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
};

// Get Petfinder token
async function getPetfinderToken(): Promise<string> {
  const response = await fetch('https://api.petfinder.com/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.PETFINDER_KEY,
      client_secret: process.env.PETFINDER_SECRET,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`);
  }

  const data: PetfinderAuthResponse = await response.json();
  return data.access_token;
}

// GET handler for retrieving a specific pet by ID
export async function GET(request: Request) {
  try {
    // Extract the pet ID from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const petId = pathParts[pathParts.length - 1];

    if (!petId) {
      return NextResponse.json(
        { message: 'Pet ID is required' },
        { status: 400 }
      );
    }

    // Get Petfinder token
    let token;
    try {
      token = await getPetfinderToken();
    } catch (tokenError) {
      console.error('Error getting Petfinder token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to get Petfinder token' },
        { status: 500 }
      );
    }

    // Fetch specific pet data from Petfinder API
    const response = await fetch(`https://api.petfinder.com/v2/animals/${petId}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 } // Cache for an hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { message: `Pet with ID ${petId} not found` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return the full pet data
    return NextResponse.json({ pet: data.animal });
  } catch (error) {
    console.error('Error fetching pet details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pet details' },
      { status: 500 }
    );
  }
}