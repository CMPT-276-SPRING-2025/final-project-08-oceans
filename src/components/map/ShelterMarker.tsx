'use client';

import React from 'react';

// This component represents a marker for a shelter on a map.
type ShelterMarkerProps = {
  name: string;
  selected?: boolean;
  onClick?: () => void;
};

/** 
 * @param name - The name of the shelter.
 * @param selected - Indicates if the marker is selected or not.
 * @param onClick - Function to call when the marker is clicked.
 * @returns {JSX.Element} A JSX element representing the shelter marker.
 */

const ShelterMarker: React.FC<ShelterMarkerProps> = ({ name, selected = false, onClick }) => {
  return (
    <div 
      className={`shelter-marker relative cursor-pointer transform transition-transform duration-200 ${selected ? 'scale-125' : 'hover:scale-110'}`}
      onClick={onClick}
      title={name}
    >
      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-orange-500 shadow-md">
        <div className={`w-4 h-4 rounded-full ${selected ? 'bg-orange-500' : 'bg-orange-300'}`}></div>
      </div>
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full">
        <div className="w-2 h-2 bg-orange-500 transform rotate-45"></div>
      </div>
      {selected && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-orange-500 text-white text-xs py-1 px-2 rounded shadow-md">
          {name}
        </div>
      )}
    </div>
  );
};

export default ShelterMarker;
