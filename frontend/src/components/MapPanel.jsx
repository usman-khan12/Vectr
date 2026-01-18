// src/components/MapPanel.jsx
import { useEffect, useRef, useState } from "react";

export function MapPanel({
  lat,
  lng,
  mode = "street", // "street" | "satellite"
  className = "",
  // NEW: Ghost Navigator props
  pois = [],
  recommendedHeading = null,
  autoNavigate = false, // When true, cycles through POIs
}) {
  const satelliteContainerRef = useRef(null);
  const streetContainerRef = useRef(null);
  const mapRef = useRef(null);
  const panoramaRef = useRef(null);
  const [currentPOIIndex, setCurrentPOIIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // Initialize map/panorama
  useEffect(() => {
    if (!lat || !lng) return;
    if (!window.google) return;

    if (mode === "satellite") {
      if (!satelliteContainerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(satelliteContainerRef.current, {
          center: { lat, lng },
          zoom: 19,
          mapTypeId: "satellite",
          disableDefaultUI: true,
        });
      } else {
        mapRef.current.setCenter({ lat, lng });
      }
      // Add marker
      new google.maps.Marker({ position: { lat, lng }, map: mapRef.current });
    } else {
      // Street View
      if (!streetContainerRef.current) return;
      if (!panoramaRef.current) {
        panoramaRef.current = new google.maps.StreetViewPanorama(
          streetContainerRef.current,
          {
            position: { lat, lng },
            pov: {
              heading: recommendedHeading || 0,
              pitch: 0,
            },
            disableDefaultUI: true,
            linksControl: false,
          },
        );
      } else {
        panoramaRef.current.setPosition({ lat, lng });
      }
    }
  }, [lat, lng, mode]);

  // GHOST NAVIGATOR: Pan to recommended heading when it changes
  useEffect(() => {
    if (mode !== "street" || !panoramaRef.current) return;
    if (recommendedHeading === null) return;

    // Smooth pan to recommended heading
    animatePOV(panoramaRef.current, recommendedHeading, 0);
  }, [recommendedHeading, mode]);

  // GHOST NAVIGATOR: Auto-cycle through POIs
  useEffect(() => {
    if (!autoNavigate || pois.length === 0 || mode !== "street") return;
    if (!panoramaRef.current) return;

    setIsNavigating(true);
    setCurrentPOIIndex(-1);
    let idx = 0;

    const interval = setInterval(() => {
      if (idx >= pois.length) {
        // Return to recommended heading
        animatePOV(panoramaRef.current, recommendedHeading || 0, 0);
        setCurrentPOIIndex(-1);
        setIsNavigating(false);
        clearInterval(interval);
        return;
      }

      const poi = pois[idx];
      animatePOV(panoramaRef.current, poi.heading, 0);
      setCurrentPOIIndex(idx);
      idx++;
    }, 3000); // 3 seconds per POI

    return () => clearInterval(interval);
  }, [autoNavigate, pois, recommendedHeading, mode]);

  // Smooth POV animation
  function animatePOV(panorama, targetHeading, targetPitch) {
    const currentPov = panorama.getPov();
    const startHeading = currentPov.heading;
    const startPitch = currentPov.pitch;

    // Handle wrap-around for heading (e.g., 350 -> 10)
    let deltaHeading = targetHeading - startHeading;
    if (deltaHeading > 180) deltaHeading -= 360;
    if (deltaHeading < -180) deltaHeading += 360;

    const duration = 1000; // 1 second
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);

      panorama.setPov({
        heading: startHeading + deltaHeading * eased,
        pitch: startPitch + (targetPitch - startPitch) * eased,
      });

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // Manual POI navigation
  function goToPOI(index) {
    if (!panoramaRef.current) return;
    if (index === -1) {
      if (recommendedHeading === null) return;
      animatePOV(panoramaRef.current, recommendedHeading, 0);
      setCurrentPOIIndex(-1);
      return;
    }
    if (!pois[index]) return;
    animatePOV(panoramaRef.current, pois[index].heading, 0);
    setCurrentPOIIndex(index);
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={satelliteContainerRef}
        className={`h-full w-full ${mode === "satellite" ? "block" : "hidden"}`}
      />
      <div
        ref={streetContainerRef}
        className={`h-full w-full ${mode === "street" ? "block" : "hidden"}`}
      />

      {mode === "street" &&
        (pois.length > 0 || recommendedHeading !== null) && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/65 px-3 py-1.5 shadow-lg shadow-black/60">
              {recommendedHeading !== null && (
                <button
                  onClick={() => goToPOI(-1)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                    currentPOIIndex === -1
                      ? "bg-green-600 text-white border border-green-400"
                      : "bg-black/60 text-white hover:bg-black/80 border border-transparent"
                  }`}
                  title="Ideal ambulance parking"
                >
                  <span>🚑</span>
                  <span className="hidden sm:inline">PARK HERE</span>
                </button>
              )}
              {pois.map((poi, idx) => (
                <button
                  key={idx}
                  onClick={() => goToPOI(idx)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    currentPOIIndex === idx
                      ? "bg-blue-600 text-white"
                      : "bg-black/60 text-white hover:bg-black/80"
                  }`}
                  title={poi.description}
                >
                  {poi.type === "entrance" && "🚪"}
                  {poi.type === "parking" && "🅿️"}
                  {poi.type === "hazard" && "⚠️"}
                  {poi.type === "approach" && "➡️"}
                </button>
              ))}
            </div>
          </div>
        )}

      {mode === "street" && (isNavigating || currentPOIIndex === -1) && (
        <div className="absolute top-2 left-2 right-2 bg-black/70 text-white text-sm px-3 py-2 rounded">
          {currentPOIIndex === -1 ? (
            <>
              <span className="font-bold uppercase text-xs text-green-400">
                RECOMMENDED PARKING
              </span>
              <span className="ml-2">Best spot for ambulance placement</span>
            </>
          ) : (
            pois[currentPOIIndex] && (
              <>
                <span className="font-bold uppercase text-xs text-blue-400">
                  {pois[currentPOIIndex].type}
                </span>
                <span className="ml-2">
                  {pois[currentPOIIndex].description}
                </span>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
