"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
// Keep mapboxgl import for types if needed, or remove if react-map-gl types suffice
import mapboxgl, { LngLatBounds } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
// Keep react-map-gl imports
import Map, { MapRef, NavigationControl, GeolocateControl, Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import { LocationSearchInput } from '../ui/locationSeachInput';

// Define types for props and state
interface Coordinates {
  longitude: number;
  latitude: number;
}

interface DirectionsMapProps {
  destinationAddress: string; 
  destinationName: string; 
  onClose: () => void;
}

interface RouteData {
  geometry: GeoJSON.LineString;
  distance: number;
  duration: number;
  steps: any[];
}

const DirectionsMap: React.FC<DirectionsMapProps> = ({ destinationAddress, destinationName, onClose }) => {
  // State for fetched data
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [endLocationCoords, setEndLocationCoords] = useState<Coordinates | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true); // For initial token/geocode fetch
  const [initError, setInitError] = useState<string | null>(null); // Error during init

  // State for user interaction and route finding
  const [startLocationInput, setStartLocationInput] = useState<string>('');
  const [startLocationCoords, setStartLocationCoords] = useState<Coordinates | null>(null);
  const [mode, setMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false); // Renamed from isLoading
  const [routeError, setRouteError] = useState<string | null>(null); // Renamed from error
  const [showStartPopup, setShowStartPopup] = useState<boolean>(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);
  const [showEndPopup, setShowEndPopup] = useState<boolean>(false);

  const mapRef = useRef<MapRef | null>(null); // Use MapRef type

  // Initial viewport - centered until coordinates are fetched
  const [viewport, setViewport] = useState({
    longitude: -123.12, 
    latitude: 49.28,
    zoom: 9,
    pitch: 0,
    bearing: 0
  });

  // Layer style for the route line
  const routeLayerStyle: mapboxgl.LineLayerSpecification = {
    id: 'route',
    type: 'line',
    source: 'route', 
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': '#3887be',
      'line-width': 5,
      'line-opacity': 0.75,
    },
  };

  // Function to fetch directions 
  const getDirections = useCallback(async () => {
    if (!startLocationInput) {
      setRouteError('Please enter a starting location.');
      setRoute(null);
      setStartLocationCoords(null);
      return;
    }
    // Ensure destination coordinates are available before fetching route
    if (!endLocationCoords) {
        setRouteError('Destination coordinates not yet available. Please wait or try again.');
        return;
    }

    setIsLoadingRoute(true);
    setRouteError(null);
    setRoute(null); 
    setStartLocationCoords(null);

    try {
      // Use the API route to get directions
      // Use fetched endLocationCoords
      const params = new URLSearchParams({
        action: 'navigation',
        origin: startLocationInput,
        destinationCoords: `${endLocationCoords.longitude},${endLocationCoords.latitude}`,
        destinationName: destinationName, // Use prop
        mode: mode,
      });

      const response = await fetch(`/api/mapbox?${params.toString()}`);

      // Check for response status
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
        setRoute(data.routes[0]);
        // Set start coordinates from the response
        if (data.origin && data.origin.coordinates) {
          setStartLocationCoords({
            longitude: data.origin.coordinates[0],
            latitude: data.origin.coordinates[1],
          });
          setShowStartPopup(true); 

          // Fly map to fit the route
          if (mapRef.current?.getMap() && data.routes[0].geometry?.coordinates) { // Access map via getMap()
             const coordinates = data.routes[0].geometry.coordinates as [number, number][]; // Assert type
             // Ensure coordinates is a valid array of coordinate pairs
             if (Array.isArray(coordinates) && coordinates.length > 0 && Array.isArray(coordinates[0])) {
                const bounds = new LngLatBounds(coordinates[0], coordinates[0]); // Use imported LngLatBounds
                coordinates.forEach(coord => bounds.extend(coord));

                mapRef.current.getMap().fitBounds(bounds, { 
                    padding: { top: 100, bottom: 150, left: 50, right: 50 }, 
                    maxZoom: 15,
                    duration: 1000 
                });
             }
          }
        } else {
           // Attempt to center map based on destination if start fails
            if (mapRef.current?.getMap() && endLocationCoords) {
                mapRef.current.getMap().flyTo({ center: [endLocationCoords.longitude, endLocationCoords.latitude], zoom: 13 });
            }
        }

      } else {
        throw new Error(data.error || 'No routes found or geometry missing.');
      }
    } catch (err: any) {
      setRouteError(err.message || 'Failed to fetch directions.');
      setRoute(null);
      setStartLocationCoords(null);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [startLocationInput, destinationName, endLocationCoords, mode]);

  // Effect to fetch token and geocode destination address on mount/change
  useEffect(() => {
    const initializeMapData = async () => {
      setIsInitializing(true);
      setInitError(null);
      setEndLocationCoords(null); 
      setMapboxToken(null); 
      setRoute(null); 
      setStartLocationCoords(null); 
      setStartLocationInput('');
      setRouteError(null); 

      try {
        // Fetch Mapbox Token
        const tokenRes = await fetch('/api/mapbox'); 
        if (!tokenRes.ok) {
            const errorData = await tokenRes.json().catch(() => ({})); 
            throw new Error(errorData.error || `Failed to fetch Mapbox token (${tokenRes.status})`);
        }
        const tokenData = await tokenRes.json();
        if (!tokenData.mapboxKey) throw new Error('Mapbox token not found in API response');
        setMapboxToken(tokenData.mapboxKey);

        // Geocode the destination address
        const geocodeParams = new URLSearchParams({
          action: 'geocode',
          address: destinationAddress,
        });
        const geocodeRes = await fetch(`/api/mapbox?${geocodeParams.toString()}`);

        // Check for geocode response status
        if (!geocodeRes.ok) {
           const errorData = await geocodeRes.json().catch(() => ({}));
           throw new Error(errorData.error || `Failed to geocode destination address (${geocodeRes.status})`);
        }
        const geocodeData = await geocodeRes.json();

        // Check if geocode data is valid
        if (geocodeData.features && geocodeData.features.length > 0) {
          const coords = geocodeData.features[0].coordinates;
          const newCoords = { longitude: coords[0], latitude: coords[1] };
          setEndLocationCoords(newCoords);
          setViewport(prev => ({
              ...prev,
              longitude: newCoords.longitude,
              latitude: newCoords.latitude,
              zoom: 12 
          }));
           // Fly map to the new destination
           if (mapRef.current?.getMap()) {
               mapRef.current.getMap().flyTo({ center: [newCoords.longitude, newCoords.latitude], zoom: 12, duration: 1000 });
           }
           setShowEndPopup(true);
        } else {
          throw new Error(`Could not find coordinates for: ${destinationAddress}`);
        }
      } catch (err: any) {
        setInitError(err.message || 'Failed to initialize map data.');
      } finally {
        setIsInitializing(false);
      }
    };

    if (destinationAddress) {
      initializeMapData();
    } else {
       // Handle case where destinationAddress is not provided initially
       setIsInitializing(false);
       setInitError("Destination address is required.");
    }
  }, [destinationAddress]); 

  // Helper to format duration (seconds to minutes/hours)
  const formatDuration = (durationSeconds: number): string => {
    if (!durationSeconds) return 'N/A';
    if (durationSeconds < 60) return `${Math.round(durationSeconds)} sec`;
    const minutes = Math.round(durationSeconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  };

  // Helper to format distance (meters to km/miles)
   const formatDistance = (distanceMeters: number): string => {
     if (!distanceMeters) return 'N/A';
     const kilometers = distanceMeters / 1000;
     return `${kilometers.toFixed(1)} km`;
   };


  // Render Loading/Error states or the Map
  if (isInitializing) {
    return <div className="flex justify-center items-center h-full">Loading Map...</div>;
  }

  if (initError) {
    return <div className="flex flex-col justify-center items-center h-full p-4 text-red-600">
        <p>Error initializing map:</p>
        <p className="mt-2 text-sm">{initError}</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-300 rounded">Close</button>
      </div>;
  }

  if (!mapboxToken || !endLocationCoords) {
     return <div className="flex justify-center items-center h-full text-red-600">Map data unavailable.</div>;
  }

  // Render the map once initialization is complete and successful
  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
      <Map
        ref={mapRef}
        longitude={viewport.longitude}
        latitude={viewport.latitude}
        zoom={viewport.zoom}
        pitch={viewport.pitch}
        bearing={viewport.bearing}
        onMove={evt => setViewport(evt.viewState)} 
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {/* End Location Marker (use endLocationCoords) */}
        {endLocationCoords && (
          <Marker longitude={endLocationCoords.longitude} latitude={endLocationCoords.latitude} anchor="bottom">
             <button onClick={() => setShowEndPopup(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
               {/* Use a distinct icon for destination */}
               <svg height="25" viewBox="0 0 24 24" fill="#D83B01" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
           </button>
        </Marker>
        )}
        {/* End Location Popup */}
        {endLocationCoords && showEndPopup && (
          <Popup
            longitude={endLocationCoords.longitude}
            latitude={endLocationCoords.latitude}
            anchor="top"
            onClose={() => setShowEndPopup(false)}
            closeOnClick={false}
            offset={25}
          >
            <div>
              <strong>Destination:</strong><br/> {destinationName}
            </div>
          </Popup>
        )}

        {/* Start Location Marker (if coordinates are known) */}
        {startLocationCoords && (
          <Marker longitude={startLocationCoords.longitude} latitude={startLocationCoords.latitude} anchor="bottom">
             <button onClick={() => setShowStartPopup(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
               <svg height="25" viewBox="0 0 24 24" fill="#007C41" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
             </button>
          </Marker>
        )}
         {startLocationCoords && showStartPopup && (
          <Popup
            longitude={startLocationCoords.longitude}
            latitude={startLocationCoords.latitude}
            anchor="top"
            onClose={() => setShowStartPopup(false)}
            closeOnClick={false} 
            offset={25} 
          >
            <div>
              <strong>Start:</strong><br/> {startLocationInput}
            </div>
          </Popup>
        )}


        {/* Route Line */}
        {route && route.geometry && (
          <Source id="route" type="geojson" data={route.geometry}>
            <Layer {...routeLayerStyle} />
          </Source>
        )}
      </Map>

      {/* Input Panel - Styled with Tailwind */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 p-4 rounded-lg shadow-lg max-w-sm w-full backdrop-blur-sm">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-4">
            {/* Title and Collapse Toggle */}
            <div className="flex items-center gap-2">
               <button
                 onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                 className="text-gray-500 hover:text-gray-800 p-1 rounded-full focus:outline-none focus:ring-1 focus:ring-gray-400"
                 aria-label={isPanelCollapsed ? "Expand panel" : "Collapse panel"}
               >
                 {/* Simple Arrow Icon */}
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 transition-transform duration-200 ${isPanelCollapsed ? 'rotate-180' : 'rotate-0'}`}> {/* Corrected rotation logic */}
                   <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /> {/* Up arrow */}
                 </svg>
               </button>
               <h4 className="text-lg font-semibold text-gray-800">
                   Directions to {destinationName}
               </h4>
            </div>
            {/* Close Button (for the whole modal) */}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 text-2xl leading-none p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Close directions"
            >
              &times;
            </button>
        </div>

        {/* Collapsible Content */}
        {!isPanelCollapsed && (
          <>
            {/* Start Location Input */}
            <div className="mb-3">
              <label htmlFor="startLocation" className="block mb-1 text-sm font-medium text-gray-700">Start Location:</label>
              <LocationSearchInput
                value={startLocationInput}
                onChange={(e) => setStartLocationInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
            </div>
            {/* Mode Selection */}
            <div className="mb-4">
              <label htmlFor="modeSelect" className="block mb-1 text-sm font-medium text-gray-700">Mode:</label>
              <select
                 id="modeSelect"
                 value={mode}
                 onChange={(e) => setMode(e.target.value as 'driving' | 'walking' | 'cycling')}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white"
               >
                <option value="driving">Driving</option>
                <option value="walking">Walking</option>
                <option value="cycling">Cycling</option>
              </select>
            </div>
            {/* Get Route Button */}
            {/* Disable button if route is loading, no start input, or destination coords missing */}
            <button
              onClick={getDirections}
              disabled={isLoadingRoute || !startLocationInput || !endLocationCoords}
              className="w-full px-4 py-2 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-150 ease-in-out bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
             >
              {isLoadingRoute ? (
                <div className="flex justify-center items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading Route...
                </div>
              ) : 'Get Route'}
            </button>
            {/* Error Message */}
            {routeError && <p className="mt-3 text-sm text-red-600">Error: {routeError}</p>}

            {/* Display Route Info */}
            {route && !isLoadingRoute && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <strong className="block mb-1 text-sm font-medium text-gray-700">Route Details:</strong>
                <p className="text-sm text-gray-600">Distance: {formatDistance(route.distance)}</p>
                <p className="text-sm text-gray-600">Estimated Time: {formatDuration(route.duration)}</p>
              </div>
            )}
          </>
        )}
      </div> 
    </div> 
  );
};


export default DirectionsMap;