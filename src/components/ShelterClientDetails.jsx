"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { assets } from '@/assets/assets';
import DirectionsMap from '@/components/map/DirectionMap';
import ShelterDetailMapWrapper from '@/components/map/ShelterDetailMapWrapper'; // Keep static map wrapper

// This component handles the client-side interactions for the shelter details page
export default function ShelterClientDetails({ shelter, backUrl }) {
  const [showDirections, setShowDirections] = useState(false);

  if (!shelter) {
    // Handle case where shelter data might not be loaded yet, though it should be passed from Server Component
    return <div className="p-20 text-center">Loading shelter details...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8 pt-28 space-y-12">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 w-full">
        <Link
          href={backUrl}
          className="ml-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
        >
          Back
        </Link>
        <div className="flex items-start gap-6 w-full md:w-2/3">
          <div className="relative w-[180px] h-[180px] bg-white rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src={shelter.photos?.[0]?.medium || assets.icon_paw}
              alt="shelter logo"
              priority
              fill
              sizes='180px'
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
          {shelter.website ? (
            <Link
              href={shelter.website}
              target="_blank"
              className="px-6 py-2 border-2 text-orange-500 border-orange-500 font-semibold rounded-full hover:bg-orange-500 hover:text-white transition duration-300"
            >
              VIEW OUR SHELTER
            </Link>
          ) : null}

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
          {/* Add Get Directions Button */}
          <button
            onClick={() => setShowDirections(true)}
            className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline text-center"
          >
            Get Directions
          </button>
        </div>
      </div>

      <hr className="border-t border-gray-300" />

      {/* Static Map */}
      <div className="w-full h-96 rounded-lg overflow-hidden shadow">
        <ShelterDetailMapWrapper shelter={shelter} />
      </div>

      {/* Directions Popup/Modal - Modified for full screen */}
      {showDirections && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"> {/* Removed p-4 */}
          {/* Inner container now takes full width and height */}
          <div className="bg-white w-full h-full relative"> {/* Removed max-w-4xl, h-[70vh], rounded-lg, shadow-xl; Added h-full */}
             <DirectionsMap
               destinationAddress={shelter.location}
               destinationName={shelter.name}
               onClose={() => setShowDirections(false)}
             />
          </div>
        </div>
      )}
    </div>
  );
}