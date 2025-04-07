import { NextResponse } from 'next/server';

// Helper function to format hours
function formatHours(hours) {
  if (!hours) return 'Hours not available';

  const entries = Object.entries(hours)
    .filter(([_, value]) => value)
    .map(([day, value]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${value}`);

  return entries.length > 0 ? entries.join(', ') : 'Hours not available';
}

export async function GET(request, { params }) {
  const { id } = params;
  
  try {
    // Get access token
    const tokenRes = await fetch('https://api.petfinder.com/v2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.PETFINDER_KEY,
        client_secret: process.env.PETFINDER_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Failed to get Petfinder token' }, { status: 500 });
    }
    
    const { access_token } = await tokenRes.json();

    // Get shelter data
    const shelterRes = await fetch(`https://api.petfinder.com/v2/organizations/${id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: 'no-store',
    });

    if (!shelterRes.ok) {
      return NextResponse.json({ error: 'Shelter not found' }, { status: 404 });
    }

    const { organization } = await shelterRes.json();

    // Format address
    const addressParts = [
      organization.address?.address1,
      organization.address?.city,
      organization.address?.state,
      organization.address?.postcode,
    ].filter(Boolean);

    // Format shelter data
    const shelter = {
      id: organization.id,
      name: organization.name,
      contact: organization.phone || 'No phone available',
      location: addressParts.join(', ') || 'No address available',
      hours: formatHours(organization.hours),
      email: organization.email,
      website: organization.website,
      mission_statement: organization.mission_statement,
      photos: organization.photos,
    };

    return NextResponse.json({ shelter });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shelter data' }, { status: 500 });
  }
}
