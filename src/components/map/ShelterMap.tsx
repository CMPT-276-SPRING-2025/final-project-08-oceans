'use client';

import React, { useEffect, useRef, useState } from 'react';
import { saveToSessionStorage, getFromSessionStorage } from '@/lib/clientStorage';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/navigation';

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
  const initialViewRef = useRef<{center: mapboxgl.LngLat | null, zoom: number | null}>({
    center: null,
    zoom: null
  });
  const activePopupRef = useRef<mapboxgl.Popup | null>(null);
  const isZoomingRef = useRef<boolean>(false);
  const router = useRouter();

  // Fetch Mapbox API key and geocode shelter addresses
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
        console.error('Error initializing map:', err);
        setError(err.message || 'Failed to initialize map');
      } finally {
        setLoading(false);
      }
    };

    initializeMap();
  }, []);

  // Geocode shelter addresses and create map once we have the API key
  useEffect(() => {
    if (!mapboxKey || !shelters.length || !mapContainer.current) return;

    const geocodeShelters = async () => {
      try {
        // Check if we have geocoded shelters in session storage
        const cacheKey = `mapbox_geocoded_shelters_${shelters.map(s => s.id).join('_')}`;
        const cachedShelters = getFromSessionStorage<Shelter[]>(cacheKey);
        
        let geocodedShelters: Shelter[];
        
        if (cachedShelters) {
          geocodedShelters = cachedShelters;
        } else {
          // Prepare addresses for batch geocoding
          const addresses = shelters.map(shelter => shelter.location);
          
          // Call our Mapbox API to geocode all addresses
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
          
          // Merge geocoding results with shelter data
          geocodedShelters = shelters.map((shelter, index) => {
            const geocodeResult = data.results[index];
            const feature = geocodeResult?.features?.[0];
            
            return {
              ...shelter,
              coordinates: feature?.coordinates as [number, number] || undefined,
            };
          });
          
          // Cache the geocoded shelters
          saveToSessionStorage(cacheKey, geocodedShelters, 60); // Cache for 60 minutes
        }
        
        // Initialize the map
        mapboxgl.accessToken = mapboxKey;
        
        if (!map.current) {
          // Find a shelter with coordinates to center the map
          const centerShelter = geocodedShelters.find(s => s.coordinates);
          const defaultCenter: [number, number] = centerShelter?.coordinates || [-98.5795, 39.8283]; // US center
          
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: defaultCenter,
            zoom: centerShelter ? 10 : 4,
          });

          // Store the initial view for reference (to zoom back out)
          map.current.once('load', () => {
            initialViewRef.current = {
              center: map.current?.getCenter() || null,
              zoom: map.current?.getZoom() || null
            };
            console.log('Initial map view stored:', initialViewRef.current);
          });
          
          // Add navigation controls
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          
          // Wait for map to load before adding markers
          map.current.on('load', () => {
            // Add markers for shelters with coordinates
            const validShelters = geocodedShelters.filter(shelter => shelter.coordinates);
            
            // Clear existing markers
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];
            
            // Add markers for each shelter
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
              
              // Create popup with shelter info and View button
              const popupContent = document.createElement('div');
              popupContent.className = 'popup-content';
              popupContent.style.maxWidth = '220px';
              popupContent.innerHTML = `
                <div>
                  <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">${shelter.name}</h3>
                  <p style="margin: 0 0 5px; font-size: 13px;">${shelter.location}</p>
                  <p style="margin: 0 0 10px; font-size: 13px;">${shelter.hours || 'Hours not available'}</p>
                  <button id="view-shelter-${shelter.id}" class="view-shelter-btn" style="background-color: #F26A21; color: white; border: none; padding: 6px 12px; border-radius: 20px; font-size: 14px; cursor: pointer; width: 100%;">
                    View Shelter
                  </button>
                </div>
              `;
              
              const popup = new mapboxgl.Popup({ 
                offset: 25,
                closeButton: true,
                closeOnClick: false
              }).setDOMContent(popupContent);
              
              // Create and add the marker
              const marker = new mapboxgl.Marker(el)
                .setLngLat(shelter.coordinates)
                .setPopup(popup)
                .addTo(map.current!);
              
              // Store marker reference for cleanup
              markersRef.current.push(marker);
              
              // Add click event to marker to zoom in and show popup
              el.addEventListener('click', () => {
                // If the initial view hasn't been captured yet, do so now
                if (!initialViewRef.current.center && map.current) {
                  initialViewRef.current = {
                    center: map.current.getCenter(),
                    zoom: map.current.getZoom()
                  };
                  console.log('Initial view captured on marker click:', initialViewRef.current);
                }
                
                // Close any existing popup
                if (activePopupRef.current) {
                  activePopupRef.current.remove();
                }
                
                // Store this popup as active
                activePopupRef.current = popup;
                
                // Zoom in to marker
                isZoomingRef.current = true;
                map.current?.flyTo({
                  center: shelter.coordinates,
                  zoom: 15,
                  essential: true,
                  duration: 1000
                });
                
                // Show popup after zooming
                setTimeout(() => {
                  marker.togglePopup();
                  isZoomingRef.current = false;
                }, 1000);
                
                // Notify parent component if needed
                if (onShelterSelect) {
                  onShelterSelect(shelter.id);
                }
              });
              
              // Add event listeners for the popup
              popup.on('open', () => {
                // Add click handler to view button
                const viewBtn = document.getElementById(`view-shelter-${shelter.id}`);
                if (viewBtn) {
                  viewBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/shelters/${shelter.id}`);
                  });
                }
              });
              
              // Add event for when popup is closed to zoom back out
              popup.on('close', () => {
                if (isZoomingRef.current) return; // Don't react if we're in the middle of zooming
                
                if (initialViewRef.current.center && initialViewRef.current.zoom) {
                  isZoomingRef.current = true;
                  console.log('Zooming back out to initial view:', initialViewRef.current);
                  
                  map.current?.flyTo({
                    center: initialViewRef.current.center,
                    zoom: initialViewRef.current.zoom,
                    essential: true,
                    duration: 1000
                  });
                  
                  setTimeout(() => {
                    isZoomingRef.current = false;
                    activePopupRef.current = null;
                  }, 1000);
                }
              });
            });
            
            // Fit map to show all markers if we have multiple
            if (validShelters.length > 1 && map.current) {
              const bounds = new mapboxgl.LngLatBounds();
              validShelters.forEach(shelter => {
                if (shelter.coordinates) {
                  bounds.extend(shelter.coordinates);
                }
              });
              
              map.current.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15,
              });
            }
          });
        }
      } catch (err: any) {
        console.error('Error geocoding shelters:', err);
        setError(err.message || 'Failed to geocode shelter addresses');
      }
    };

    geocodeShelters();

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxKey, shelters, onShelterSelect, router]);

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
