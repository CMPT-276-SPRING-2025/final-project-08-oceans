'use client';

import { useEffect, useState } from 'react';
import { saveToSessionStorage, getFromSessionStorage } from '@/lib/clientStorage';

/**
 * ShelterDetailMap component displays a static map of the shelter's location using Mapbox API.
 * @param {*} shelter - The shelter object containing the location to be geocoded.
 * @returns {JSX.Element} A component that displays a static map of the shelter's location.
 */
export default function ShelterDetailMap({ shelter }) {
  const [mapboxKey, setMapboxKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [staticMapUrl, setStaticMapUrl] = useState(null);

  // Fetch Mapbox API key
  useEffect(() => {
    const getMapboxKey = async () => {
      try {
        // Check if we have the key in session storage
        const cachedKey = getFromSessionStorage('mapbox_api_key');
        if (cachedKey) {
          setMapboxKey(cachedKey);
          return;
        }
        
        // Fetch the key from our API
        const response = await fetch('/api/mapbox');
        const data = await response.json();
        
        if (data.mapboxKey) {
          setMapboxKey(data.mapboxKey);
          saveToSessionStorage('mapbox_api_key', data.mapboxKey, 60); // Cache for 60 minutes
        } else {
          throw new Error('Failed to get Mapbox API key');
        }
      } catch (err) {
        setError(err.message || 'Failed to load map');
      }
    };

    getMapboxKey();
  }, []);

  // Geocode the shelter address
  useEffect(() => {
    if (!mapboxKey || !shelter) return;
    
    const geocodeShelterAddress = async () => {
      try {
        setLoading(true);
        
        // Check if we have cached coordinates
        const cacheKey = `mapbox_geocoded_shelter_${shelter.id}`;
        const cachedCoordinates = getFromSessionStorage(cacheKey);
        
        let shelterCoordinates;
        
        if (cachedCoordinates) {
          shelterCoordinates = cachedCoordinates;
        } else {
          // Geocode the address
          const response = await fetch('/api/mapbox', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'geocode',
              addresses: [shelter.location],
            }),
          });
          
          const data = await response.json();
          
          if (!data.results || !data.results[0]?.features?.[0]?.coordinates) {
            throw new Error('Failed to geocode shelter address');
          }
          
          shelterCoordinates = data.results[0].features[0].coordinates;
          
          // Cache the coordinates
          saveToSessionStorage(cacheKey, shelterCoordinates, 60); // Cache for 60 minutes
        }
        
        setCoordinates(shelterCoordinates);
      } catch (err) {
        setError(err.message || 'Failed to determine location');
        setCoordinates(null);
      } finally {
        setLoading(false);
      }
    };
    
    geocodeShelterAddress();
  
  }, [mapboxKey, shelter]);

  // Initialize the static map
  useEffect(() => {

    if (!coordinates || !mapboxKey || staticMapUrl) {
        // If we have coordinates & key, but maybe loading is still true from key fetch, stop it.
        if (coordinates && mapboxKey && loading) setLoading(false);
        return;
    }

    const fetchStaticMap = async () => {
      // setLoading(true); // Set loading true specifically for this fetch step
      setError(null); // Clear previous errors before fetching URL

      try {
        const lon = coordinates[0];
        const lat = coordinates[1];
        // Construct URL for the API route
        const apiUrl = `/api/mapbox?action=staticmap&lon=${lon}&lat=${lat}`;

        const response = await fetch(apiUrl);
        // Check if the response is ok 
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch static map URL: ${response.statusText}`);
        }

        const data = await response.json();

        // Check if the static map URL is present in the response
        if (data.staticMapURL) {
          setStaticMapUrl(data.staticMapURL);
        } else {
          throw new Error('Static map URL not found in API response');
        }

      } catch (err) {
        setError(err.message || 'Failed to load map image');
        setStaticMapUrl(null); 
      } finally {
        setLoading(false);
      }
    };

    // Check if we have the coordinates and mapboxKey before fetching the static map
     if (coordinates && mapboxKey) {
        fetchStaticMap();
     }

  }, [coordinates, mapboxKey, staticMapUrl]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-gray-700">Loading map...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center text-red-500 p-4">
            <p>Error: {error}</p>
            <p className="text-sm mt-2">Please try refreshing the page.</p>
          </div>
        </div>
      )}
      
      {!loading && !error && staticMapUrl && (
        <img
          key={staticMapUrl}
          src={staticMapUrl}
          alt={`Map showing location of ${shelter?.name || 'the shelter'}`}
          className="w-full h-full rounded-lg object-cover"
        />
      )}
    </div>
  );
}
