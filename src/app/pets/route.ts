import { NextResponse } from 'next/server';
import breeds from './Quiz_Breed_questions/Bird-Small-Fish-Reptile-Breeds.json';
export const dynamic = "auto"
export const revalidate = 3600 // Revalidate data every hour

type PetfinderAuthResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
};

type PetfinderPet = {
  id: number;
  type: {
    name: string;
  };
  breeds: {
    primary: string;
    secondary: string | null;
    mixed: boolean;
    unknown: boolean;
  };
  age: string;
  name: string;
  gender: string;
  size: string;
  photos: Array<{
    small: string;
    medium: string;
    large: string;
    full: string;
  }>;
  distance?: number;
};

type PetfinderResponse = {
  animals: PetfinderPet[];
  pagination: {
    count_per_page: number;
    total_count: number;
    current_page: number;
    total_pages: number;
  };
};

type SimplifiedPet = {
  id: number;
  type: string;
  breed: string;
  age: string;
  gender: string;
  size: string;
  name: string;
  photos?: Array<{
    small: string;
    medium: string;
    large: string;
    full: string;
  }>;
};

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

export async function GET(request: Request) {
  const cacheKey = request.url;
  
  try {
    // Try to get a token for the Petfinder API
    let token;
    try {
      token = await getPetfinderToken();
    } catch (tokenError) {
      console.error('Error getting Petfinder token:', tokenError);
      // For tests, return a 500 error
      return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 });
    }

    const url = new URL(request.url);
    const { searchParams } = url;
    const type = searchParams.get('type') || undefined;
    const subType = searchParams.get('subType') || undefined;
    const breed = searchParams.get('breed') || undefined;
    const age = searchParams.get('age') || undefined;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '100';
    const location = searchParams.get('location') || undefined;

    let animals: PetfinderPet[] = [];
    let pagination = {
      count_per_page: 0,
      total_count: 0,
      current_page: 1,
      total_pages: 1
    };

    try {
      // Handle reptile/fish breed filtering differently
      if (type === 'scales-fins-other' && subType) {
          const breedList = subType === 'reptile'
              ? breeds.reptile_breeds
              : breeds.fish_breeds;

          console.log(`Fetching ${subType} with breeds:`, breedList);

          // Join all breeds into a single string
          const allBreeds = breedList.join(',');

          const queryParams = new URLSearchParams();
          queryParams.append('type', type);
          queryParams.append('breed', allBreeds); // Append all breeds
          if (age) queryParams.append('age', age);
          queryParams.append('page', page);
          queryParams.append('limit', limit);

          if (location){
            queryParams.append('location', location);
            queryParams.append('sort', 'distance');
          }

          console.log(`Fetching all ${subType} breeds with params: ${queryParams.toString()}`);

          const response = await fetch(`https://api.petfinder.com/v2/animals?${queryParams.toString()}`, {
              headers: { Authorization: `Bearer ${token}` },
              next: { revalidate: 3600 }
          });

          if (!response.ok) {
              console.error(`Failed to fetch ${subType} breeds: ${response.statusText}`);
          } else {
              const data: PetfinderResponse = await response.json();
              animals = [...animals, ...data.animals];
              pagination = data.pagination;
          }
      }
      else if (type === 'small-pets') {
        let smallFurryAnimals: PetfinderPet[] = [];
        let rabbitAnimals: PetfinderPet[] = [];

        // Fetch small-furry
        const queryParamsSmallFurry = new URLSearchParams();
        queryParamsSmallFurry.append('type', 'small-furry');
        if (breed) queryParamsSmallFurry.append('breed', breed);
        if (age) queryParamsSmallFurry.append('age', age);
        queryParamsSmallFurry.append('page', page);
        queryParamsSmallFurry.append('limit', String(Math.ceil(Number(limit) / 2))); // Use first half of limit
        if (location){
          queryParamsSmallFurry.append('location', location);
          queryParamsSmallFurry.append('sort', 'distance');
        }

        console.log(`Fetching small-furry with params: ${queryParamsSmallFurry.toString()}`);

        const responseSmallFurry = await fetch(`https://api.petfinder.com/v2/animals?${queryParamsSmallFurry.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 3600 } // Cache for an hour
        });

        if (!responseSmallFurry.ok) {
          console.error(`API error fetching small-furry: ${responseSmallFurry.statusText}`);
        } else {
          const dataSmallFurry: PetfinderResponse = await responseSmallFurry.json();
          smallFurryAnimals = dataSmallFurry.animals;
          // Use pagination from the first call as a base
          pagination = dataSmallFurry.pagination;
        }

        // Fetch rabbit
        const queryParamsRabbit = new URLSearchParams();
        queryParamsRabbit.append('type', 'rabbit');
        if (breed) queryParamsRabbit.append('breed', breed);
        if (age) queryParamsRabbit.append('age', age);
        queryParamsRabbit.append('page', page);
        queryParamsRabbit.append('limit', String(Math.ceil(Number(limit) / 2))); // Use remaining half of limit
        if (location){
          queryParamsRabbit.append('location', location);
          queryParamsRabbit.append('sort', 'distance');
        }

        console.log(`Fetching rabbit with params: ${queryParamsRabbit.toString()}`);

        const responseRabbit = await fetch(`https://api.petfinder.com/v2/animals?${queryParamsRabbit.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 3600 } // Cache for an hour
        });

        if (!responseRabbit.ok) {
          console.error(`API error fetching rabbit: ${responseRabbit.statusText}`);
        } else {
          const dataRabbit: PetfinderResponse = await responseRabbit.json();
          rabbitAnimals = dataRabbit.animals;
        }


        if (location){
          // Merge the two sorted arrays
          animals = [];
          let smallFurryIndex = 0;
          let rabbitIndex = 0;

          while (smallFurryIndex < smallFurryAnimals.length && rabbitIndex < rabbitAnimals.length) {
            const distanceA = smallFurryAnimals[smallFurryIndex].distance === undefined ? Number.MAX_VALUE : smallFurryAnimals[smallFurryIndex].distance;
            const distanceB = rabbitAnimals[rabbitIndex].distance === undefined ? Number.MAX_VALUE : rabbitAnimals[rabbitIndex].distance;

            if (distanceA <= distanceB) {
              animals.push(smallFurryAnimals[smallFurryIndex]);
              smallFurryIndex++;
            } else {
              animals.push(rabbitAnimals[rabbitIndex]);
              rabbitIndex++;
            }
          }

          // Add any remaining elements from smallFurryAnimals
          while (smallFurryIndex < smallFurryAnimals.length) {
            animals.push(smallFurryAnimals[smallFurryIndex]);
            smallFurryIndex++;
          }

          // Add any remaining elements from rabbitAnimals
          while (rabbitIndex < rabbitAnimals.length) {
            animals.push(rabbitAnimals[rabbitIndex]);
            rabbitIndex++;
          }
        }
        else{
          // Combine the results randomly
          animals = [];
          let smallFurryIndex = 0;
          let rabbitIndex = 0;

          while (smallFurryIndex < smallFurryAnimals.length || rabbitIndex < rabbitAnimals.length) {
            if (Math.random() < 0.5 && smallFurryIndex < smallFurryAnimals.length) {
              animals.push(smallFurryAnimals[smallFurryIndex]);
              smallFurryIndex++;
            } else if (rabbitIndex < rabbitAnimals.length) {
              animals.push(rabbitAnimals[rabbitIndex]);
              rabbitIndex++;
            } else if (smallFurryIndex < smallFurryAnimals.length) {
              animals.push(smallFurryAnimals[smallFurryIndex]);
              smallFurryIndex++;
            }
          }
        }
      } else {
        // Normal filtering for other types
        const queryParams = new URLSearchParams();
        if (type) queryParams.append('type', type);
        if (breed) queryParams.append('breed', breed);
        if (age) queryParams.append('age', age);
        queryParams.append('page', page);
        queryParams.append('limit', limit);

        if (location){
          queryParams.append('location', location);
          queryParams.append('sort', 'distance');
        }

        console.log(`Fetching with params: ${queryParams.toString()}`);
        
        const response = await fetch(`https://api.petfinder.com/v2/animals?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 3600 } // Cache for an hour
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data: PetfinderResponse = await response.json();
        animals = data.animals;
        pagination = data.pagination;
      }

      // Log the raw API response to see what we're getting
      console.log('Total animals fetched:', animals.length);
      console.log('Sample animals:', JSON.stringify(animals.slice(0, 2), null, 2));

      // Use a Map to deduplicate pets by ID
      const uniquePetsMap = new Map<number, SimplifiedPet>();
      
      // Simplify pet data before sending response
      animals.forEach((pet) => {
        // Skip if we already have this pet ID
        if (uniquePetsMap.has(pet.id)) {
          return;
        }
        
        // Handle the type object with name property correctly
        const petType = pet.type && pet.type.name ? pet.type.name : '';
        
        // When debugging, log each pet's photos
        if (pet.photos && pet.photos.length > 0) {
          console.log(`Pet ${pet.id} has ${pet.photos.length} photos. First photo medium URL: ${pet.photos[0]?.medium || 'undefined'}`);
        } else {
          console.log(`Pet ${pet.id} has no photos`);
        }
        
        uniquePetsMap.set(pet.id, {
          id: pet.id,
          type: petType,
          breed: pet.breeds?.primary || "Unknown",
          age: pet.age || "Unknown",
          gender: pet.gender || "Unknown",
          size: pet.size || "Unknown",
          name: pet.name || `Pet ${pet.id}`,
          photos: pet.photos,
        });
      });

      // Convert the Map to an array
      const simplifiedPets = Array.from(uniquePetsMap.values());

      // Just return all pets without filtering for photos now
      console.log(`Total pets after simplification and deduplication: ${simplifiedPets.length}`);
    
      return NextResponse.json({ 
        pets: simplifiedPets,
        pagination: pagination
      });
    } catch (error) {
      console.error('Error fetching pets:', error);
      return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error fetching pets:', error);
    return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 });
  }
}

// Fallback sample data when API fails - uses public URLs instead of local assets
function getSamplePets(filterType?: string | null): SimplifiedPet[] {
  // Create sample pets with proper types to match SimplifiedPet
  const samplePets: SimplifiedPet[] = [
    {
      id: 101,
      type: 'dog',
      breed: 'Mixed Breed',
      age: 'Young',
      gender: 'Male',
      size: 'Large',
      name: 'Buddy',
      photos: [
        {
          small: 'https://placedog.net/100/100',
          medium: 'https://placedog.net/300/300',
          large: 'https://placedog.net/600/600',
          full: 'https://placedog.net/1000/1000'
        }
      ]
    },
    {
      id: 102,
      type: 'cat',
      breed: 'Domestic Short Hair',
      age: 'Adult',
      gender: 'Female',
      size: 'Medium',
      name: 'Whiskers',
      photos: [
        {
          small: 'https://placekitten.com/100/100',
          medium: 'https://placekitten.com/300/300',
          large: 'https://placekitten.com/600/600',
          full: 'https://placekitten.com/1000/1000'
        }
      ]
    },
    {
      id: 103,
      type: 'bird',
      breed: 'Parakeet',
      age: 'Young',
      gender: 'Male',
      size: 'Small',
      name: 'Tweety',
      photos: [
        {
          small: 'https://picsum.photos/id/210/100/100',
          medium: 'https://picsum.photos/id/210/300/300',
          large: 'https://picsum.photos/id/210/600/600',
          full: 'https://picsum.photos/id/210/1000/1000'
        }
      ]
    },
    {
      id: 104,
      type: 'small',
      breed: 'Hamster',
      age: 'Young',
      gender: 'Female',
      size: 'Small',
      name: 'Peanut',
      photos: [
        {
          small: 'https://picsum.photos/id/1074/100/100',
          medium: 'https://picsum.photos/id/1074/300/300',
          large: 'https://picsum.photos/id/1074/600/600',
          full: 'https://picsum.photos/id/1074/1000/1000'
        }
      ]
    },
    {
      id: 105,
      type: 'reptile',
      breed: 'Gecko',
      age: 'Adult',
      gender: 'Male',
      size: 'Small',
      name: 'Rex',
      photos: [
        {
          small: 'https://picsum.photos/id/24/100/100',
          medium: 'https://picsum.photos/id/24/300/300',
          large: 'https://picsum.photos/id/24/600/600',
          full: 'https://picsum.photos/id/24/1000/1000'
        }
      ]
    }
  ];
  
  if (filterType && filterType !== 'all') {
    return samplePets.filter(pet => pet.type === filterType);
  }
  
  return samplePets;
}
