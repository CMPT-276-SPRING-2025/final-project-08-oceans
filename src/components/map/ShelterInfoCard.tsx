'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LoadingBar } from '@/components/ui/loading-bar';

type ShelterInfoCardProps = {
  id: string;
  name: string;
  address: string;
  onClose: () => void;
  isLoading?: boolean;
};

const ShelterInfoCard: React.FC<ShelterInfoCardProps> = ({
  id,
  name,
  address,
  onClose,
  isLoading = false
}) => {
  // Adjusted styles for use within Mapbox Popup
  return (
    <div className="bg-white border border-orange-300 rounded-lg shadow-xl p-3 animate-fade-in max-w-xs"> {/* Added max-width */}
      {/* Header - Use normal flow */}
      <div className="h-2.5 bg-orange-500 rounded-t-lg -mx-3 -mt-3 mb-2"></div>

      {/* Container for close button and content */}
      <div className="relative">
        {/* Close button - Position relative to this new container */}
        <button
          className="absolute top-0 right-0 text-gray-500 hover:text-gray-700 transition-colors z-10 p-1" // Added padding for easier click
          onClick={onClose}
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Content - Adjust margins/padding as needed */}
        <div className="pt-1"> {/* Add padding top */}
          <h3 className="text-lg font-semibold text-gray-800 leading-tight mb-1 pr-6">{name}</h3> {/* Add padding-right to avoid overlap */}
          <p className="text-sm text-gray-600 mb-3">{address}</p>

          <div className="flex justify-end mt-3">
            {isLoading ? (
              <div className="w-full">
                {/* Ensure LoadingBar props are correct */}
                <LoadingBar isLoading={true} />
                <p className="text-sm text-center text-gray-500">Loading shelter details...</p>
              </div>
            ) : (
              <Link href={`/shelters/${id}`} passHref className="w-full">
                <Button variant="default" size="default" className="bg-orange-500 hover:bg-orange-600 text-white w-full py-2 text-base font-medium"> {/* Adjusted padding */}
                  View Shelter
                </Button>
              </Link>
            )}
          </div>
        </div> {/* Closing tag for content div */}
      </div> {/* Closing tag for relative container */}
    </div> // Closing tag for main div
  );
};

export default ShelterInfoCard;
