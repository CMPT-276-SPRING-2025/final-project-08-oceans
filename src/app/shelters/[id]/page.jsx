// app/shelters/[id]/page.jsx

import React from 'react';
import Image from 'next/image';
import { assets } from '@/assets/assets';
import Link from 'next/link';

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
    console.error('Error fetching shelter:', error);
    return null;
  }
}

export default async function ShelterDetail({ params }) {
  const shelter = await getShelter(params.id);
  if (!shelter) return <div className="p-20 text-center text-red-500">Shelter not found.</div>;

  return (
    <div className="max-w-6xl mx-auto p-8 pt-28 space-y-12">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 w-full">
        <div className="flex items-start gap-6 w-full md:w-2/3">
          <div className="w-[180px] h-[180px] bg-white rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src={shelter.photos?.[0]?.medium || assets.icon_paw}
              alt="shelter logo"
              width={180}
              height={150}
              className="object-cover"
            />
          </div>
  
          <div className="flex flex-col space-y-3">
            <h1 className="text-3xl font-bold text-gray-800">{shelter.name}</h1>
            <hr className="border-t border-gray-300" />
  
            <div className="flex gap-6 items-start pt-4">
              <Image src={assets.location} alt="location" width={40} />
              <div className="text-lg text-gray-700">
                <p>{shelter.location || 'Location not available'}</p>
                <p className="text-sm mt-2 text-gray-500">{shelter.hours}</p>
              </div>
            </div>
          </div>
        </div>
  
        <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
          <a
            href={shelter.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="px-6 py-2 border-2 text-orange-500 border-orange-500 font-semibold rounded-full hover:bg-orange-500 hover:text-white transition duration-300">
              VIEW OUR SHELTER
            </button>
          </a>
          <div className="w-full border-t border-gray-200" />
          <div className="flex gap-6 items-center self-start">
            <Image src={assets.email} alt="email" width={30} />
            <a href={`mailto:${shelter.email}`} className="text-lg text-orange-500">{shelter.email || 'N/A'}</a>
          </div>
          <div className="w-full border-t border-gray-200" />
          <div className="flex gap-6 items-center self-start">
            <Image src={assets.phone} alt="phone" width={30} />
            <a href={`tel:${shelter.contact}`} className="text-lg text-orange-500">{shelter.contact || 'N/A'}</a>
          </div>
        </div>
      </div>
  
      <hr className="border-t border-gray-300" />
  
      {/* Map Placeholder */}
      <div className="w-full h-96 rounded-lg overflow-hidden shadow">
        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-lg">
          Loading map...
        </div>
      </div>
    </div>
  );
  
}

// Helper
function formatHours(hours) {
  if (!hours) return 'Hours not available';

  const entries = Object.entries(hours)
    .filter(([_, value]) => value)
    .map(([day, value]) => `${day.charAt(0).toUpperCase() + day.slice(1)}: ${value}`);

  return entries.length > 0 ? entries.join(', ') : 'Hours not available';
}
