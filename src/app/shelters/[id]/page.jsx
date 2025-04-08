import React from 'react'; 
import Image from 'next/image';
import { assets } from '@/assets/assets';
import Link from 'next/link';
import ShelterDetailMapWrapper from '@/components/map/ShelterDetailMapWrapper';
import ShelterClientDetails from '@/components/ShelterClientDetails'; 


async function getShelter(id) {
  try {
    const tokenRes = await fetch('https://api.petfinder.com/v2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.PETFINDER_KEY,
        client_secret: process.env.PETFINDER_SECRET,
      }),
    });


    // Check if the token request was successful
    if (!tokenRes.ok) throw new Error('Failed to get Petfinder token');
    const { access_token } = await tokenRes.json();

    const shelterRes = await fetch(`https://api.petfinder.com/v2/organizations/${id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: 'no-store',
    });

    if (!shelterRes.ok) return null;

    const { organization } = await shelterRes.json();

    const addressParts = [
      organization.address?.address1,
      organization.address?.city,
      organization.address?.state,
      organization.address?.postcode,
    ].filter(Boolean);

    return {
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
  } catch (error) {
    return null;
  }
}

export default async function ShelterDetail({ params, searchParams }) {
  // Extract the ID value before passing to client components
  const { id } = await params; 
  const shelterId = id;

  // Check if shelter is valid by ID, fetching from server
  const shelter = await getShelter(shelterId);
  if (!shelter) return <div className="p-20 text-center text-red-500">Shelter not found.</div>;

  const searchPar = await searchParams;
  const backUrl = searchPar.backUrl || '/shelters';

  // Render the client component, passing the fetched data as props
  return <ShelterClientDetails shelter={shelter} backUrl={backUrl} />;
}

//Helper to format hours
function formatHours(hours) {
  if (!hours) return 'Hours not available';

  const entries = Object.entries(hours)
    .filter(([_, value]) => value)
    .map(([day, value]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${value}`);

  return entries.length > 0 ? entries.join(', ') : 'Hours not available';
}