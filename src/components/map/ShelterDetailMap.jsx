'use client';

import { useEffect, useRef, useState, useCallback } from 'react'; // Add useCallback
import { saveToSessionStorage, getFromSessionStorage } from '@/lib/clientStorage';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import DirectionMap from './DirectionMap'; // Import DirectionMap

export default function ShelterDetailMap({ shelter }) {
  const [mapboxKey, setMapboxKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coordinates, setCoordinates] = useState(null); // [longitude, latitude]
  const [showDirectionsPopup, setShowDirectionsPopup] = useState(false); // State for popup visibility

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
        
        // Function to handle opening the directions popup
        const handleGetDirectionsClick = () => {
          // Close the mapbox popup first if it's open
          if (popup.isOpen()) {
            popup.remove();
          }
          setShowDirectionsPopup(true);
        };

        // Note: Event listener for the button will be handled via delegation below
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
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch static map URL: ${response.statusText}`);
        }

        const data = await response.json();

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

     if (coordinates && mapboxKey) {
        fetchStaticMap();
     }

  }, [coordinates, mapboxKey, staticMapUrl]);

  // Callback to close the directions popup
  const handleCloseDirections = useCallback(() => {
    setShowDirectionsPopup(false);
  }, []);

  // Effect for handling clicks on the directions button via event delegation
  useEffect(() => {
    const mapNode = mapContainer.current;

    const handleClick = (event) => {
      // Check if the clicked element is the button we care about
      if (event.target.matches('#get-directions')) {
        // Check if it's inside a mapbox popup
        if (event.target.closest('.mapboxgl-popup')) {
          // Find the associated popup instance if needed, though we might not need it now
          // const popupElement = event.target.closest('.mapboxgl-popup');
          // Close the mapbox popup first (optional, but good UX)
          const openPopups = map.current?.getContainer().querySelectorAll('.mapboxgl-popup');
          openPopups?.forEach(p => {
            // This is a bit hacky way to potentially close it, might need refinement
            // Or find the specific popup instance associated with the marker if possible
            p.remove();
          });

          setShowDirectionsPopup(true);
        }
      }
    };

    // Add listener to the map container
    mapNode?.addEventListener('click', handleClick);

    // Cleanup: remove listener when component unmounts
    return () => {
      mapNode?.removeEventListener('click', handleClick);
    };
  }, []); // Run only once on mount

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

      {/* Directions Popup Modal */}
      {showDirectionsPopup && coordinates && mapboxKey && (
        <div style={{
          position: 'fixed', // Use fixed to overlay the whole page
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000, // Ensure it's above other content
          backgroundColor: 'white',
          padding: '20px', // Add some padding around the map component
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          width: 'clamp(300px, 80vw, 800px)', // Responsive width
          height: 'clamp(400px, 80vh, 700px)', // Responsive height
          display: 'flex', // Use flex for centering the inner map
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <DirectionMap
            mapboxToken={mapboxKey}
            endLocation={{ longitude: coordinates[0], latitude: coordinates[1] }} // Pass coordinates correctly
            endLocationName={shelter.name}
            onClose={handleCloseDirections} // Pass the close handler
          />
        </div>
      )}
      {/* Backdrop */}
      {showDirectionsPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999, // Below the popup but above other content
          }}
          onClick={handleCloseDirections} // Close popup when clicking backdrop
        />
      )}
    </div>
  );
}
