'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LocationSearchInput } from '@/components/ui/locationSeachInput';
import { LoadingBar } from '@/components/ui/loading-bar'; // Import LoadingBar
const ResultsPage = () => {
  const [pets, setPets] = useState([]);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [pageTitle, setPageTitle] = useState('Your Perfect Pet Awaits! 🐾');
  const [location, setLocation] = useState(''); // New state for location filter
  const [loading, setLoading] = useState(true); // Initialize loading state to true
  const router = useRouter();

  // Initial loading from localStorage (pets, petType, petSubType, etc.)
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
        setPets([]);
      }
    }

    if (fallback) {
      setFallbackMessage(fallback);
    }

    // Dynamic title logic
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
    setLoading(false); // Set loading to false after initial load
  }, []);

  // New function to search pets by location and quiz filters
  const handleLocationSearch = async () => {
    const petType = localStorage.getItem('petType');
    const petSubType = localStorage.getItem('petSubType');
    // Retrieve stored quiz query filters
    const quizQuery = localStorage.getItem('quizQuery') || '';

    // Build the URL by merging quiz filters with the location filter
    let url = `/pets?${quizQuery}&type=${petType}`;
    if (petSubType) {
      url += `&subType=${petSubType}`;
    }
    if (location) {
      url += `&location=${encodeURIComponent(location)}`;
    }

    setLoading(true); // Set loading to true before fetching
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data?.pets?.length) {
        const petsWithPhotos = data.pets.filter(pet => pet.photos && pet.photos.length > 0);
        setPets(petsWithPhotos);
        setFallbackMessage('');
      } else {
        setPets([]);
        setFallbackMessage('No pets found for this location. Try a different location.');
      }
    } catch (err) {
      setFallbackMessage('Something went wrong. Please try again later.');
    } finally {
      setLoading(false); // Set loading to false after fetch completes
    }
  };

  return (
    <div className="w-full text-center min-h-screen pt-28 px-10">
      <LoadingBar
        isLoading={loading}
        message={loading ? "Loading Pets..." : ""} // Change message slightly
      />
      <h2 className="text-3xl font-semibold mb-4">{pageTitle}</h2>

      {fallbackMessage && (
        <p className="text-orange-500 text-lg mb-6 font-medium">{fallbackMessage}</p>
      )}
      
      <div className="mb-8">
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white text-lg rounded-full shadow-xl px-8 py-3"
          onClick={() => window.location.href = '/quiz'}
        >
          Retake Quiz
        </Button>
      </div>

        {/* Location filter input and search button */}
      <div className="mb-8 flex justify-center gap-4">
        <LocationSearchInput
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="!max-w-[400px]"
        />
        <Button
          className="bg-orange-500 hover:bg-orange-600 text-white text-lg rounded-full shadow-xl px-8 py-3"
          onClick={handleLocationSearch}
        >
          Search
        </Button>
      </div>

      {pets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12 px-26">
          {pets.map((pet) => (
            <Card
              key={pet.id}
              className="rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition py-3 duration-600 bg-orange-50"
            >
              <CardHeader className="relative h-40 w-full mb-3 flex justify-center mt-4">
                <img
                  src={pet.photos?.[0]?.medium || 'https://via.placeholder.com/300x300?text=No+Image'}
                  alt={pet.name}
                  width={180}
                  height={180}
                  className="h-full object-cover rounded-lg"
                />
              </CardHeader>

              <CardContent className="text-center">
                <h3 className="text-xl font-semibold">{pet.name}</h3>
                <ul className="text-md text-gray-700 mt-2 space-y-1">
                  <li>{pet.breed}</li>
                  <li>{pet.age} • {pet.gender}</li>
                </ul>
              </CardContent>

              <CardFooter className="flex justify-center mb-2">
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6 text-md"
                  onClick={() => {
                    setLoading(true); // Set loading to true
                    // Optional: store filters if you want them available on details page
                    localStorage.setItem('petFilters', JSON.stringify({
                      type: localStorage.getItem('petType') || '',
                      subType: localStorage.getItem('petSubType') || ''
                    }));
                    const backUrl = encodeURIComponent(window.location.pathname + window.location.search);
                    router.push(`/pets/${pet.id}?backURL=${backUrl}`);
                  }}
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