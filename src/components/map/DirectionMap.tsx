"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl, { LngLatBounds } from 'mapbox-gl'; // Import LngLatBounds
import 'mapbox-gl/dist/mapbox-gl.css';
import Map from 'react-map-gl/mapbox';
import { MapRef } from 'react-map-gl/mapbox'; // Import MapRef separately
import {
    NavigationControl,
    GeolocateControl,
    Marker,
    Popup,
    Source,
    Layer
  } from 'react-map-gl/mapbox';

// Define types for props and state
interface Coordinates {
  longitude: number;
  latitude: number;
}

interface DirectionsMapProps {
  endLocation: Coordinates;
  endLocationName: string;
  mapboxToken: string;
  onClose: () => void; // Add onClose prop for closing the popup
}

interface RouteData {
  geometry: GeoJSON.LineString;
  distance: number;
  duration: number;
  steps: any[];
}

const DirectionsMap: React.FC<DirectionsMapProps> = ({ endLocation, endLocationName, mapboxToken, onClose }) => {
  const [startLocationInput, setStartLocationInput] = useState<string>('');
  const [startLocationCoords, setStartLocationCoords] = useState<Coordinates | null>(null);
  const [mode, setMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartPopup, setShowStartPopup] = useState<boolean>(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false); // State for panel collapse
  const [showEndPopup, setShowEndPopup] = useState<boolean>(false);

  const mapRef = useRef<MapRef | null>(null); // Use MapRef type

  const [viewport, setViewport] = useState({
    longitude: endLocation.longitude,
    latitude: endLocation.latitude,
    zoom: 12,
    pitch: 0,
    bearing: 0
  });

  // Layer style for the route line
  const routeLayerStyle: mapboxgl.LineLayerSpecification = { // Use mapboxgl.LineLayerSpecification type
    id: 'route',
    type: 'line',
    source: 'route', // Corresponds to Source id
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
      setError('Please enter a starting location.');
      setRoute(null);
      setStartLocationCoords(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setRoute(null); // Clear previous route
    setStartLocationCoords(null); // Clear previous start coords

    try {
      // Use the API route to get directions
      const params = new URLSearchParams({
        action: 'navigation',
        origin: startLocationInput, // Origin still needs geocoding
        // Pass destination coordinates directly
        destinationCoords: `${endLocation.longitude},${endLocation.latitude}`,
        destinationName: endLocationName, // Pass name separately for potential display
        mode: mode,
      });

      const response = await fetch(`/api/mapbox?${params.toString()}`);

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
          setShowStartPopup(true); // Show popup for the start location

          // Fly map to fit the route
          if (mapRef.current?.getMap() && data.routes[0].geometry?.coordinates) { // Access map via getMap()
             const coordinates = data.routes[0].geometry.coordinates as [number, number][]; // Assert type
             // Ensure coordinates is a valid array of coordinate pairs
             if (Array.isArray(coordinates) && coordinates.length > 0 && Array.isArray(coordinates[0])) {
                // Initialize bounds with the first coordinate
                const bounds = new LngLatBounds(coordinates[0], coordinates[0]); // Use imported LngLatBounds
                // Extend the bounds with the rest of the coordinates
                coordinates.forEach(coord => bounds.extend(coord));

                mapRef.current.getMap().fitBounds(bounds, { // Access map via getMap()
                    padding: { top: 100, bottom: 150, left: 50, right: 50 }, // Adjust padding
                    maxZoom: 15,
                    duration: 1000 // Animation duration
                });
             }
          }
        } else {
           console.warn("Origin coordinates not found in navigation response.");
           // Attempt to center map based on destination if start fails
            if (mapRef.current?.getMap()) { // Access map via getMap()
                mapRef.current.getMap().flyTo({ center: [endLocation.longitude, endLocation.latitude], zoom: 13 });
            }
        }

      } else {
        throw new Error(data.error || 'No routes found or geometry missing.');
      }
    } catch (err: any) {
      console.error('Failed to fetch directions:', err);
      setError(err.message || 'Failed to fetch directions.');
      setRoute(null);
      setStartLocationCoords(null);
    } finally {
      setIsLoading(false);
    }
  }, [startLocationInput, endLocationName, endLocation, mode, mapboxToken]); // Added mapboxToken to dependency array as it's used in fetch

  // Effect to recenter map when endLocation changes
  useEffect(() => {
    setViewport(prev => ({
      ...prev,
      longitude: endLocation.longitude,
      latitude: endLocation.latitude,
      zoom: 12 // Reset zoom or adjust as needed
    }));
     if (mapRef.current?.getMap()) { // Access map via getMap()
        mapRef.current.getMap().flyTo({ center: [endLocation.longitude, endLocation.latitude], zoom: 12 });
     }
    // Clear route and input when destination changes
    setRoute(null);
    setStartLocationCoords(null);
    setStartLocationInput('');
    setError(null);
    setShowStartPopup(false);
    setShowEndPopup(false);
  }, [endLocation, endLocationName]); // Depend on coordinates and name

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
     // Optionally convert to miles: const miles = kilometers * 0.621371;
     return `${kilometers.toFixed(1)} km`;
   };


  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
      <Map
        ref={mapRef} // Assign ref here
        initialViewState={viewport} // Use initialViewState for uncontrolled map
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v11" // Or your preferred map style
        // Remove onMove if using initialViewState for uncontrolled behavior
        // onMove={evt => setViewport(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {/* End Location Marker */}
        <Marker longitude={endLocation.longitude} latitude={endLocation.latitude} anchor="bottom">
           <button onClick={() => setShowEndPopup(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
             {/* Use a distinct icon for destination */}
             <svg height="25" viewBox="0 0 24 24" fill="#D83B01" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
           </button>
        </Marker>
        {showEndPopup && (
          <Popup
            longitude={endLocation.longitude}
            latitude={endLocation.latitude}
            anchor="top"
            onClose={() => setShowEndPopup(false)}
            closeOnClick={false} // Keep open until explicitly closed
            offset={25} // Offset popup from marker center
          >
            <div>
              <strong>Destination:</strong><br/> {endLocationName}
            </div>
          </Popup>
        )}

        {/* Start Location Marker (if coordinates are known) */}
        {startLocationCoords && (
          <Marker longitude={startLocationCoords.longitude} latitude={startLocationCoords.latitude} anchor="bottom">
             <button onClick={() => setShowStartPopup(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
               {/* Use a distinct icon for origin */}
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
            closeOnClick={false} // Keep open until explicitly closed
            offset={25} // Offset popup from marker center
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
                   Directions to {endLocationName}
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
          <> {/* Use Fragment */}
            {/* Start Location Input */}
            <div className="mb-3">
              <label htmlFor="startLocation" className="block mb-1 text-sm font-medium text-gray-700">Start Location:</label>
              <input
                type="text"
                id="startLocation"
                value={startLocationInput}
                onChange={(e) => setStartLocationInput(e.target.value)}
                placeholder="Enter address or place name"
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
            <button
              onClick={getDirections}
              disabled={isLoading || !startLocationInput} // Disable if no input
              className="w-full px-4 py-2 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition duration-150 ease-in-out bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
             >
              {isLoading ? (
                <div className="flex justify-center items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </div>
              ) : 'Get Route'}
            </button>
            {/* Error Message */}
            {error && <p className="mt-3 text-sm text-red-600">Error: {error}</p>}

            {/* Display Route Info */}
            {route && !isLoading && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <strong className="block mb-1 text-sm font-medium text-gray-700">Route Details:</strong>
                <p className="text-sm text-gray-600">Distance: {formatDistance(route.distance)}</p>
                <p className="text-sm text-gray-600">Estimated Time: {formatDuration(route.duration)}</p>
                {/* Optional: Add a button/link to view steps if needed */}
              </div>
            )}
            {/* End of Route Info */}
          </>
        )}
        {/* End of Conditional Rendering */}
      </div> {/* End of Input Panel Div */}
    </div> /* End of Main Component Div */
  );
};


export default DirectionsMap;