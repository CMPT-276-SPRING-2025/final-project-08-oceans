'use client';

import { useEffect, useRef, useState } from 'react';
import { saveToSessionStorage, getFromSessionStorage } from '@/lib/clientStorage';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function ShelterDetailMap({ shelter }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapboxKey, setMapboxKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coordinates, setCoordinates] = useState(null);

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
        console.error('Error getting Mapbox key:', err);
        setError(err.message || 'Failed to load map');
      }
    };

    getMapboxKey();
  }, []);

  // Geocode the shelter address and initialize map
  useEffect(() => {
    if (!mapboxKey || !mapContainer.current || !shelter) return;
    
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
        
        // Initialize the map
        mapboxgl.accessToken = mapboxKey;
        
        if (map.current) map.current.remove();
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: shelterCoordinates,
          zoom: 14,
        });
        
        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
        // Add marker
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `
          <div style="max-width: 200px; padding: 10px;">
            <h3 style="margin: 0 0 8px; font-weight: 600;">${shelter.name}</h3>
            <p style="margin: 0 0 8px; font-size: 13px;">${shelter.location}</p>
            <button id="get-directions" style="background-color: #F26A21; color: white; border: none; padding: 6px 12px; border-radius: 20px; font-size: 14px; cursor: pointer; width: 100%;">
              Get Directions
            </button>
          </div>
        `;
        
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setDOMContent(popupContent);
        
        new mapboxgl.Marker({ color: '#F26A21' })
          .setLngLat(shelterCoordinates)
          .setPopup(popup)
          .addTo(map.current)
          .togglePopup(); // Show popup by default
        
        // Add click handler to the Get Directions button
        map.current.on('load', () => {
          const directionsButton = document.getElementById('get-directions');
          if (directionsButton) {
            directionsButton.addEventListener('click', () => {
              // Open in Google Maps
              const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shelter.location)}`;
              window.open(url, '_blank');
            });
          }
        });
      } catch (err) {
        console.error('Error initializing map:', err);
        setError(err.message || 'Failed to load map');
      } finally {
        setLoading(false);
      }
    };
    
    geocodeShelterAddress();
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxKey, shelter]);

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
      
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
}
