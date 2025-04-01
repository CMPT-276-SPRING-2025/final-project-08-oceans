'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const ResultsPage = () => {
  const [pets, setPets] = useState([]);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [pageTitle, setPageTitle] = useState('Your Perfect Pet Awaits! 🐾');
  const router = useRouter();

  useEffect(() => {
    const storedPets = localStorage.getItem('pets');
    const fallback = localStorage.getItem('fallbackMessage');
    const petType = localStorage.getItem('petType');
    const petSubType = localStorage.getItem('petSubType');

    if (storedPets) {
      try {
        const allPets = JSON.parse(storedPets);
        const petsWithPhotos = allPets.filter(pet => pet.photos && pet.photos.length > 0);
        setPets(petsWithPhotos);
      } catch (err) {
        console.error('Failed to parse stored pets:', err);
        setPets([]);
      }
    }

    if (fallback) {
      setFallbackMessage(fallback);
    }

    //  Dynamic title logic
    if (petType === 'scales-fins-other' && petSubType === 'fish') {
      setPageTitle('Fish Available for Adoption🐟');
    } else if (petType === 'scales-fins-other' && petSubType === 'reptile') {
      setPageTitle('Reptiles Available for Adoption🦖');
    } else if (petType === 'small-pets') {
      setPageTitle('Small Pets Available for Adoption🐰');
    } else if (petType === 'dog') {
      setPageTitle('Dogs Available for Adoption🐶');
    } else if (petType === 'cat') {
      setPageTitle('Cats Available for Adoption🐾');
    } else if (petType === 'bird') {
      setPageTitle('Birds Available for Adoption🐣');
    }
  }, []);

  return (
    <div className="w-full text-center min-h-screen pt-28 px-10">
      <h2 className="text-3xl font-semibold mb-4">{pageTitle}</h2>

      {fallbackMessage && (
        <p className="text-orange-500 text-lg mb-6 font-medium">{fallbackMessage}</p>
      )}
      <div className="mb-8">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white text-lg rounded-full shadow-xl px-8 py-3"
          onClick={() => window.location.href = '/'}
        >
          Retake Quiz
        </Button>
      </div>

      {pets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12 px-26">
          {pets.map((pet) => (
            <Card
              key={pet.id}
              className="shadow-md hover:shadow-lg transition duration-300 rounded-xl bg-orange-50"
            >
              <CardHeader className="flex justify-center p-4">
                <img
                  src={pet.photos?.[0]?.medium || 'https://via.placeholder.com/300x300?text=No+Image'}
                  alt={pet.name}
                  className="w-40 h-40 object-cover rounded-lg"
                />
              </CardHeader>

              <CardContent className="text-center">
                <h3 className="text-xl font-semibold">{pet.name}</h3>
                <ul className="text-sm text-gray-700 mt-2 space-y-1">
                  <li>• Breed: {pet.breed || 'Unknown'}</li>
                  <li>• Age: {pet.age}</li>
                  <li>• Gender: {pet.gender}</li>
                  <li>• Size: {pet.size}</li>
                </ul>
              </CardContent>

              <CardFooter className="flex justify-center p-4">
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 py-2 text-md"
                  onClick={() => window.open(`https://www.petfinder.com/search/pets-for-adoption/?pet_id=${pet.id}`, '_blank')}
                >
                  Adopt me!
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mt-10">No pets found. Try retaking the quiz.</p>
      )}

    </div>
  );
};

export default ResultsPage;
