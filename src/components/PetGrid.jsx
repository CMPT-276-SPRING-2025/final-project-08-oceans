'use client';

import React from 'react';

const PetGrid = ({ pets, goToDetailPage}) => {
  if (!pets || !Array.isArray(pets) || pets.length === 0) {
    return <div className="text-center py-10">No pets found.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
      {pets.map((pet) => {
        if (!pet || !pet.id) {
          return null;
        }

        // Only use images from the API, no fallbacks
        const hasPhoto = pet.photos && 
                        Array.isArray(pet.photos) && 
                        pet.photos.length > 0 && 
                        pet.photos[0] && 
                        pet.photos[0].medium;
        
        // Skip pets without photos
        if (!hasPhoto) {
          return null;
        }
        
        const imageSrc = pet.photos[0].medium;
        
        return (
          <div key={pet.id} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-600 bg-orange-50">
            <div className="p-4 flex flex-col items-center">
              <div className="relative h-40 w-full mb-3 flex justify-center mt-4">
                <img
                  src={imageSrc}
                  alt={pet.name || 'Pet'}
                  width={180}
                  height={180}
                  className="h-full object-cover rounded-lg"
                />
              </div>
              <h3 className="text-xl font-semibold text-center">{pet.name}</h3>
              <div className="mt-2 text-center text-gray-600">
                <p>{pet.breed}</p>
                <p>{pet.age} • {pet.gender}</p>
              </div>
                <button 
                  className="mt-4 px-4 py-2 bg-[#F26A21] text-white rounded-full hover:bg-orange-600 transition"
                  onClick={() => goToDetailPage(pet.id)}
                >
                  Adopt me!
                </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PetGrid;
