import { NextResponse } from 'next/server';
export const dynamic = "force-dynamic" 
export const revalidate = 0

type PetfinderAuthResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
};

type PetfinderOrganizationAddress = {
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
};

type PetfinderOrganizationHours = {
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
  saturday: string | null;
  sunday: string | null;
};

type PetfinderOrganizationAdoption = {
  policy: string | null;
  url: string | null;
};

type PetfinderOrganizationSocialMedia = {
  facebook: string | null;
  twitter: string | null;
  youtube: string | null;
  instagram: string | null;
  pinterest: string | null;
};

type PetfinderOrganization = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: PetfinderOrganizationAddress;
  hours: PetfinderOrganizationHours;
  url: string | null;
  website: string | null;
  mission_statement: string | null;
  adoption: PetfinderOrganizationAdoption;
  social_media: PetfinderOrganizationSocialMedia;
  photos: Array<{
    small: string;
    medium: string;
    large: string;
    full: string;
  }>;
  distance: number | null;
  _links: {
    self: {
      href: string;
    };
    animals: {
      href: string;
    };
  };
};

type PetfinderOrganizationResponse = {
  organizations: PetfinderOrganization[];
  pagination: {
    count_per_page: number;
    total_count: number;
    current_page: number;
    total_pages: number;
    _links: {
      next?: {
        href: string;
      };
    };
  };
};

type SimplifiedShelter = {
  id: string;
  name: string;
  contact: string;
  location: string;
  hours: string;
  email: string | null;
  website: string | null;
  mission_statement: string | null;
  lat?: number;
  lng?: number;
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
  });

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`);
  }

  const data: PetfinderAuthResponse = await response.json();
  return data.access_token;
}

export async function GET(request: Request) {
  try {
    // Try to get a token for the Petfinder API
    let token;
    try {
      token = await getPetfinderToken();
    } catch (tokenError) {
      // Return sample data if token fetch fails
      return NextResponse.json({ 
        shelters: getSampleShelters(),
        pagination: {
          count_per_page: 20,
          total_count: getSampleShelters().length,
          current_page: 1,
          total_pages: 1
        }
      });
    }

    const url = new URL(request.url);
    const { searchParams } = url;
    const location = searchParams.get('location') || undefined;
    const name = searchParams.get('name') || undefined;
    
    const state = searchParams.get('state') || undefined;
    const country = searchParams.get('country') || undefined;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '21';

    try {
      const queryParams = new URLSearchParams();
      
      if (location) {
        queryParams.append('location', location);
        queryParams.append('distance', '100');
      }
      
      if (name) queryParams.append('name', name);
      if (state) queryParams.append('state', state);
      if (country) queryParams.append('country', country);
      
      queryParams.append('page', page);
      queryParams.append('limit', limit);
      
      if (location) {
        queryParams.append('sort', 'distance');
      }

      
      const response = await fetch(`https://api.petfinder.com/v2/organizations?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 400 || (!location && !name)) {
          return NextResponse.json({ 
            shelters: getSampleShelters(),
            pagination: {
              count_per_page: 20,
              total_count: getSampleShelters().length,
              current_page: 1,
              total_pages: 1
            }
          });
        }
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: PetfinderOrganizationResponse = await response.json();

      // Simplify organization data before sending response
      const simplifiedShelters: SimplifiedShelter[] = data.organizations.map((org) => {
        const addressParts = [
          org.address?.address1,
          org.address?.city,
          org.address?.state,
          org.address?.postcode
        ].filter(Boolean);
        
        const location = addressParts.join(', ');
        
        // Format the hours
        const hours = formatHours(org.hours);
        
        return {
          id: org.id,
          name: org.name,
          contact: org.phone || 'No phone available',
          location: location || 'No address available',
          hours: hours || 'Hours not available',
          email: org.email,
          website: org.website,
          mission_statement: org.mission_statement,
          photos: org.photos,
        };
      });

      // Return the simplified shelters and pagination info
      return NextResponse.json({ 
        shelters: simplifiedShelters,
        pagination: data.pagination
      });
    } catch (error) {
      // Return sample data if API fetch fails
      return NextResponse.json({ 
        shelters: getSampleShelters(),
        pagination: {
          count_per_page: 20,
          total_count: getSampleShelters().length,
          current_page: 1,
          total_pages: 1
        }
      });
    }

  } catch (error) {
    // Return sample data for any other errors
    return NextResponse.json({ 
      shelters: getSampleShelters(),
      pagination: {
        count_per_page: 20,
        total_count: getSampleShelters().length,
        current_page: 1,
        total_pages: 1
      }
    });
  }
}

// Helper function to format hours in a readable format
function formatHours(hours: PetfinderOrganizationHours | null): string {
  if (!hours) return 'Hours not available';
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hoursEntries = [
    { day: 'Monday', hours: hours.monday },
    { day: 'Tuesday', hours: hours.tuesday },
    { day: 'Wednesday', hours: hours.wednesday },
    { day: 'Thursday', hours: hours.thursday },
    { day: 'Friday', hours: hours.friday },
    { day: 'Saturday', hours: hours.saturday },
    { day: 'Sunday', hours: hours.sunday }
  ];
  
  // Check if all hours are the same (or null)
  const uniqueHours = new Set(Object.values(hours).filter(Boolean));
  if (uniqueHours.size === 1) {
    // All days have the same hours
    const value = uniqueHours.values().next().value;
    return `Open daily: ${value}`;
  } else if (uniqueHours.size === 0) {
    // No hours information
    return 'Hours not available';
  }
  
  // Try to find patterns like weekdays vs weekends
  const weekdayHours = [hours.monday, hours.tuesday, hours.wednesday, hours.thursday, hours.friday];
  const weekendHours = [hours.saturday, hours.sunday];
  
  const uniqueWeekdayHours = new Set(weekdayHours.filter(Boolean));
  const uniqueWeekendHours = new Set(weekendHours.filter(Boolean));
  
  if (uniqueWeekdayHours.size === 1 && uniqueWeekendHours.size === 1) {
    const weekdayValue = uniqueWeekdayHours.values().next().value;
    const weekendValue = uniqueWeekendHours.values().next().value;
    if (weekdayValue === weekendValue) {
      return `Open daily: ${weekdayValue}`;
    }
    return `Weekdays: ${weekdayValue || 'Closed'}, Weekends: ${weekendValue || 'Closed'}`;
  }
  
  // Default: return a summarized format
  return hoursEntries
    .filter(entry => entry.hours)
    .map(entry => `${entry.day.substring(0, 3)}: ${entry.hours}`)
    .join(', ') || 'Hours not available';
}

// Fallback sample data when API fails
function getSampleShelters(): SimplifiedShelter[] {
  return [
    { 
      id: "S1", 
      name: "Sunshine Animal Rescue", 
      contact: "(555) 123-4567", 
      location: "123 Main St, Seattle, WA 98101", 
      hours: "Mon-Fri: 9am-5pm, Sat-Sun: 10am-4pm",
      email: "info@sunshineanimalrescue.org",
      website: "https://www.sunshineanimalrescue.org",
      mission_statement: "Finding loving homes for animals in need"
    },
    { 
      id: "S2", 
      name: "Happy Tails Pet Sanctuary", 
      contact: "(555) 987-6543", 
      location: "456 Oak Ave, Portland, OR 97201", 
      hours: "Daily: 10am-6pm",
      email: "adopt@happytails.org",
      website: "https://www.happytails.org",
      mission_statement: "Every pet deserves a loving home"
    },
    { 
      id: "S3", 
      name: "Second Chance Animal Shelter", 
      contact: "(555) 222-3333", 
      location: "789 Elm St, San Francisco, CA 94110", 
      hours: "Weekdays: 8am-7pm, Weekends: 9am-5pm",
      email: "rescue@secondchance.org",
      website: "https://www.secondchanceshelter.org",
      mission_statement: "Giving animals a second chance at happiness"
    },
    { 
      id: "S4", 
      name: "Furry Friends Adoption Center", 
      contact: "(555) 444-5555", 
      location: "101 Pine St, Los Angeles, CA 90001", 
      hours: "Mon-Sat: 9am-6pm, Sun: Closed",
      email: "info@furryfriends.org",
      website: "https://www.furryfriends.org",
      mission_statement: "Connecting pets with loving families"
    },
    { 
      id: "S5", 
      name: "Paws & Claws Rescue", 
      contact: "(555) 777-8888", 
      location: "222 Maple Ave, Denver, CO 80201", 
      hours: "Daily: 8am-8pm",
      email: "contact@pawsandclaws.org",
      website: "https://www.pawsandclaws.org",
      mission_statement: "Saving one paw at a time"
    },
    { 
      id: "S6", 
      name: "Forever Homes Animal Shelter", 
      contact: "(555) 999-0000", 
      location: "333 Cedar Blvd, Austin, TX 78701", 
      hours: "Tue-Sun: 10am-5pm, Mon: Closed",
      email: "adopt@foreverhomes.org",
      website: "https://www.foreverhomes.org",
      mission_statement: "Finding forever homes for every pet"
    }
  ];
}
