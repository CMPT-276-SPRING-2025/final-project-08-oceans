'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { saveToSessionStorage, getFromSessionStorage, generateCacheKey } from '@/lib/clientStorage';
import { LoadingBar } from '@/components/ui/loading-bar';
import { useRouter } from 'next/navigation';
import ShelterMap from '@/components/map/ShelterMap';
import { LocationSearchInput } from "@/components/ui/locationSeachInput";

/**
 * @returns Shelters component that displays a list of pet shelters and allows users to search for shelters by location or name.
 */
const Shelters = () => {
  const router = useRouter();
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Loading shelters...");
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedShelterId, setSelectedShelterId] = useState(null);

  useEffect(() => {
    let timer;

    // Start the loading animation
    if (loading) {
      setLoadingProgress(10);
      setTimeout(() => setLoadingProgress(30), 100);
      setTimeout(() => setLoadingProgress(50), 400);
      setTimeout(() => setLoadingProgress(70), 800);
      
      timer = setTimeout(() => {
        setLoadingProgress(90);
      }, 1500);
    } else {
      // Complete the progress animation
      setLoadingProgress(100);
      timer = setTimeout(() => {
        setLoadingProgress(0);
      }, 500);
    }
    
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    async function fetchShelters() {
      setLoading(true);
      setLoadingMessage("Loading shelters...");
      setError(null);
      
      try {
        // Generate cache key for all shelters (no search params)
        const cacheKey = 'petfinder_all_shelters';
        
        // Check if we have cached shelter data
        const cachedShelters = getFromSessionStorage(cacheKey);
        
        // If cached data exists, use it
        if (cachedShelters) {
          setShelters(cachedShelters);
          setLoading(false);
          return;
        }
        

        const response = await fetch('/api/shelters');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.shelters && Array.isArray(data.shelters)) {
          // Save to session storage (cache for 30 minutes)
          saveToSessionStorage(cacheKey, data.shelters, 30);
          setShelters(data.shelters);
        } else {

          setShelters([]);
        }
      } catch (err) {

        setError(err.message);
        setShelters([]);
      } finally {
        setLoading(false);
      }
    }

    fetchShelters();
  }, []);

  // Handle search by location or name
  const handleSearch = async () => {
    setLoading(true);
    setLoadingMessage("Searching shelters...");
    setError(null);

    try {
      // Build the URL with search parameters
      const queryParams = new URLSearchParams();
      if (locationSearch) queryParams.set('location', locationSearch);
      if (nameSearch) queryParams.set('name', nameSearch);
      
      // Generate a cache key based on search parameters
      const cacheKey = generateCacheKey('petfinder_shelters_search', {
        location: locationSearch,
        name: nameSearch
      });
      
      // Check if we have cached search results
      const cachedResults = getFromSessionStorage(cacheKey);
      
      if (cachedResults) {
        setShelters(cachedResults);
        setLoading(false);
        return;
      }
      
      const url = `/api/shelters${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.shelters && Array.isArray(data.shelters)) {
        // Save search results to session storage (cache for 15 minutes)
        saveToSessionStorage(cacheKey, data.shelters, 15);
        setShelters(data.shelters);
      } else {

        setShelters([]);
      }
    } catch (err) {

      setError(err.message);
      setShelters([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle view shelter details
  const handleViewShelter = (shelterId) => {
    setIsNavigating(true);
    setLoadingMessage("Loading shelter details...");
    
    // Create a smooth loading animation
    setLoadingProgress(10);
    setTimeout(() => setLoadingProgress(40), 100);
    setTimeout(() => setLoadingProgress(70), 300);
    
    // Construct the back URL with the current page's URL
    const backUrl = encodeURIComponent(window.location.pathname + window.location.search); 
    
    // Navigate after a short delay to allow the loading animation to be seen
    setTimeout(() => {
      router.push(`/shelters/${shelterId}?backUrl=${backUrl}`);
    }, 600);
  };

  // Handle shelter selection on the map    
  const handleShelterSelect = useCallback((shelterId) => {
    setSelectedShelterId(shelterId); 

    const shelterCardId = `shelter-${shelterId}`;
    const shelterCard = document.getElementById(shelterCardId);
    if (shelterCard) {
        shelterCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        shelterCard.classList.add('ring-2', 'ring-orange-500', 'transition-shadow', 'duration-1500');
        setTimeout(() => {
            const currentCard = document.getElementById(shelterCardId);
            currentCard?.classList.remove('ring-2', 'ring-orange-500');
        }, 2000);
    }

  }, []);

    

  return (
    <div className="w-full mx-auto p-20 pt-[100px] 2xl:pt-[150px]">
      <LoadingBar 
        isLoading={loading || isNavigating} 
        message={loadingMessage}
        progress={loadingProgress}
      />
      
      {/* Search Section */}
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-semibold">Search nearby pet shelters</h2>
        <div className="flex w-full max-w-2xl gap-3">
            {/* By location search */}
            <LocationSearchInput
              placeholder="Location"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
            />
          <span className="self-center">or</span>
          {/* By shelter name search */}
          <Input 
            placeholder="Shelter name" 
            className="flex-1 bg-white border border-orange-400 hover:border-2"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
          />
          <Button 
            className="ml-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
            onClick={handleSearch}
          >
            Search
          </Button>
        </div>
      </div>

      {/* Interactive Map */}
      <div 
        className="w-full h-96 bg-gray-200 rounded-lg mt-6 overflow-hidden shadow-lg"
        >
        {!loading && shelters.length > 0 ? (
          <ShelterMap 
            shelters={shelters} 
            onShelterSelect={handleShelterSelect}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
            {loading ? "Loading map..." : "No shelters to display on map"}
          </div>
        )}
      </div>

      {/* Results Section */}
      <h3 className="text-center text-xl font-semibold mt-8">Here are the results:</h3>
      
      {/* Loading and Error States */}
      {loading ? (
        <div className="text-center py-10"></div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">
          Error: {error}
        </div>
      ) : shelters.length === 0 ? (
        <div className="text-center py-10">No shelters found. Try a different search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-6">
          {shelters.map((shelter) => (
            <div 
              key={shelter.id}
              id={`shelter-${shelter.id}`}
              className={`flex flex-col hover:shadow-xl h-fit hover:scale-105 transition duration-400 rounded-2xl ${selectedShelterId === shelter.id ? 'ring-2 ring-orange-500' : ''}`}
            >
              <Card className="flex bg-orange-100 p-4 rounded-2xl shadow-md ">
                <div className="flex items-center gap-2">
                  {/* Shelter Image */}
                  <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center">
                    {shelter.photos && shelter.photos.length > 0 ? (
                      <img 
                        src={shelter.photos[0].medium} 
                        alt={shelter.name}
                        className="w-full h-14/12 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/150x150?text=🏠';
                        }}
                      />
                    ) : (
                      <span className="text-4xl">🏠</span>
                    )}
                  </div>
                  {/* Shelter Info */}
                  <CardContent className="flex-1 p-2">
                    <h4 className="text-lg font-semibold">{shelter.name}</h4>
                    <p className="text-sm">Contact: {shelter.contact}</p>
                    <p className="text-sm">Location: {shelter.location}</p>
                    <p className="text-sm">Open: {shelter.hours}</p>
                    <Button 
                      className="mt-4 bg-orange-500 hover:bg-orange-600 text-white w-full text-md rounded-2xl"
                      onClick={() => handleViewShelter(shelter.id)}
                    >
                      View
                    </Button>
                  </CardContent>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Shelters
