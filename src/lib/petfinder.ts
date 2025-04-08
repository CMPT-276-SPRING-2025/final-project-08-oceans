// lib/petfinder.ts

/*
getPetFinderToken(): Fetches details from the Petfinder API to return the token from the API
*/
export async function getPetfinderToken(): Promise<string> {
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
  
    //If POST failed to get response, throws error
    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.statusText}`);
    }
  
    const data = await response.json();
    return data.access_token;
  }
  
  //fetchPetDetails(): Takes in a string as an ID, returns the response as a JSON
  export async function fetchPetDetails(id: string) {
    const token = await getPetfinderToken();
    const response = await fetch(`https://api.petfinder.com/v2/animals/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 }
    });
    
    // Handle the response and check for errors
    if (!response.ok) {
      throw new Error(`Failed to fetch pet: ${response.statusText}`);
    }
    
    return response.json();
  }