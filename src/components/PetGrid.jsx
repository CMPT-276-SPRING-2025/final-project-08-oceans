'use client';

import React from 'react';

const PetGrid = ({ pets, goToDetailPage}) => {

  // Check if pets is null or undefined, or if it's not an array or is empty
  if (!pets || !Array.isArray(pets) || pets.length === 0) {
    return <div className="text-center py-10">No pets found.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-2 sm:px-0">

      {pets.map((pet) => {
        if (!pet || !pet.id) {
          return null;
        }

        const hasPhoto = pet.photos && 
                        Array.isArray(pet.photos) && 
                        pet.photos.length > 0 && 
                        pet.photos[0] && 
                        pet.photos[0].medium;
        
        if (!hasPhoto) {
          return null;
        }
        
        const imageSrc = pet.photos[0].medium;
        
        return (
          <div
            key={pet.id}
            className="rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-600 bg-orange-50 w-[75%] sm:w-full mx-auto"
          >
            <div className="p-3 sm:p-4 flex flex-col items-center">
              <div className="relative h-32 sm:h-40 w-full mb-3 flex justify-center mt-3">
                <img
                  src={imageSrc}
                  alt={pet.name || 'Pet'}
                  width={180}
                  height={180}
                  className="h-full object-cover rounded-lg"
                />
              </div>
              <h3 className="text-base sm:text-xl font-semibold text-center">{pet.name}</h3>
              <div className="mt-2 text-center text-gray-600 text-sm sm:text-base">
                <p>{pet.breed}</p>
                <p>{pet.age} • {pet.gender}</p>
              </div>

                <button 
                className="mt-3 px-3 py-1.5 text-sm sm:text-base bg-[#F26A21] text-white rounded-full hover:bg-orange-600 transition"
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
