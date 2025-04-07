'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { saveToSessionStorage, getFromSessionStorage } from '@/lib/clientStorage';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type Shelter = {
  id: string;
  name: string;
  location: string;
  contact: string;
  hours: string;
  email: string | null;
  website: string | null;
  mission_statement: string | null;
  photos?: Array<{
    small: string;
    medium: string;
    large: string;
    full: string;
  }>;
  coordinates?: [number, number]; // [longitude, latitude]
};

type ShelterMapProps = {
  shelters: Shelter[];
  onShelterSelect?: (shelterId: string) => void;
};

const ShelterMap: React.FC<ShelterMapProps> = ({ shelters, onShelterSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxKey, setMapboxKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);


  // Debounce function (utility)
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => func(...args), waitFor);
    };
  };

  // Debounced version of fitBounds/flyTo for smoother adjustments
  const debouncedFitMapToBounds = useCallback(debounce((validShelters: Shelter[]) => {
    if (!map.current) return;
    if (validShelters.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        validShelters.forEach(shelter => {
            if (shelter.coordinates) {
                bounds.extend(shelter.coordinates);
            }
        });
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
    } else if (validShelters.length === 1) {
        map.current.flyTo({ center: validShelters[0].coordinates, zoom: 12, duration: 500 });
    }
  }, 300), []); // Recreate if map instance changes (shouldn't often)
  

  // Fetch Mapbox API key
  useEffect(() => {
    const initializeMap = async () => {
      try {
        setLoading(true);
        
        // Check if we have the Mapbox key in session storage
        const cachedKey = getFromSessionStorage<string>('mapbox_api_key');
        if (cachedKey) {
          setMapboxKey(cachedKey);
        } else {
          // Fetch the Mapbox key from our API
          const response = await fetch('/api/mapbox');
          const data = await response.json();
          
          if (data.mapboxKey) {
            setMapboxKey(data.mapboxKey);
            saveToSessionStorage('mapbox_api_key', data.mapboxKey, 60); // Cache for 60 minutes
          } else {
            throw new Error('Failed to get Mapbox API key');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize map');
      } finally {
        setLoading(false);
      }
    };

    initializeMap();
  }, []);

  // Initialize the map only once when mapboxKey is available
  useEffect(() => {
    if (!mapboxKey || !mapContainer.current) return;

    mapboxgl.accessToken = mapboxKey;

    if (map.current && map.current.isStyleLoaded()) {
      setIsMapLoaded(true);
      return;
    }

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-98.5795, 39.8283], // US center
        zoom: 4,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
      setIsMapLoaded(true);
    });
    }

    return () => {
      if (map.current && typeof map.current.remove === 'function') {
        map.current.remove();
      }
      map.current = null;
      setIsMapLoaded(false);
    };
  }, [mapboxKey]);

  // Update markers when shelters change
  useEffect(() => {
    if (!map.current || !isMapLoaded || !mapboxKey || !shelters.length){

      if (markersRef.current.length > 0) {
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
      }
      return;
    }

    const updateMarkers = async () => {
      try {
        // Geocode shelters
        const addresses = shelters.map(shelter => shelter.location);

        const response = await fetch('/api/mapbox', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'geocode',
            addresses,
          }),
        });

        const data = await response.json();

        if (!data.results) {
          throw new Error('Failed to geocode shelter addresses');
        }

        const geocodedShelters = shelters.map((shelter, index) => {
          const geocodeResult = data.results[index];
          const feature = geocodeResult?.features?.[0];

          return {
            ...shelter,
            coordinates: feature?.coordinates as [number, number] || undefined,
            geocodeError: feature ? null : 'Failed to geocode', // Add geocode error
          };
        });

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add markers for shelters with coordinates
        const validShelters = geocodedShelters.filter(shelter => shelter.coordinates);

        validShelters.forEach(shelter => {
          if (!shelter.coordinates) return;

          // Create custom marker element
          const el = document.createElement('div');
          el.className = 'shelter-marker';
          el.style.width = '25px';
          el.style.height = '25px';
          el.style.backgroundImage = 'url(https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png)';
          el.style.backgroundSize = 'cover';
          el.style.cursor = 'pointer';
          el.setAttribute('aria-label', `Shelter: ${shelter.name}`);

          // Create popup with shelter info
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="max-width: 220px; font-family: sans-serif;">
              <h3 style="margin: 0 0 5px; font-size: 15px; color: #333;">${shelter.name}</h3>
              <p style="margin: 0 0 3px; font-size: 12px; color: #555;">${shelter.location}</p>
              ${shelter.contact ? `<p style="margin: 0 0 3px; font-size: 12px; color: #555;">${shelter.contact}</p>` : ''}
              ${shelter.website ? `<a href="${shelter.website.startsWith('http') ? shelter.website : `https://${shelter.website}`}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #007bff; display: block; margin-bottom: 8px; word-break: break-all;">Visit Website</a>` : ''}
              <button data-shelter-id="${shelter.id}" class="popup-details-button" style="margin-top: 5px; padding: 4px 10px; font-size: 12px; background-color: #f97316; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;">View Details</button>
            </div>
          `);

          // Create and add the marker
          const marker = new mapboxgl.Marker(el)
            .setLngLat(shelter.coordinates)
            .setPopup(popup)
            .addTo(map.current!);

          // Store marker reference for cleanup
          markersRef.current.push(marker);
        });

        debouncedFitMapToBounds(validShelters);

      } catch (err: any) {
        setError(err.message || 'Failed to update markers');
      }
    };

    // Wait for the map to load before updating markers
    if (map.current && map.current.isStyleLoaded()) {
      updateMarkers();
    } else {
      map.current?.on('load', updateMarkers);
    }
  }, [shelters, mapboxKey, isMapLoaded]);

  // Handle click events on shelter markers
  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !isMapLoaded || !onShelterSelect) return;

    const mapContainerElement = mapInstance.getContainer();

    const handlePopupClick = (e: MouseEvent) => {
      const button = (e.target as HTMLElement).closest('.popup-details-button');

      if (button && button.hasAttribute('data-shelter-id')) {
        const shelterId = button.getAttribute('data-shelter-id');
        if (shelterId) {
          onShelterSelect(shelterId);

           const openPopup = mapContainerElement.querySelector('.mapboxgl-popup');
           if (openPopup) {
               openPopup.remove();
           }
        }
      }
    };

    // Add the delegated event listener to the map container
    mapContainerElement.addEventListener('click', handlePopupClick);


    return () => {
      mapContainerElement.removeEventListener('click', handlePopupClick);

    };
  }, [onShelterSelect, isMapLoaded]);

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
};

export default ShelterMap;