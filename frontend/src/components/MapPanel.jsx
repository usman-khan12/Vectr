import { useEffect, useRef, useState } from "react";

export default function MapPanel(props) {
  const { lat, lng, mode, className } = props || {};
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const streetViewRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasCoords = typeof lat === "number" && typeof lng === "number";

  useEffect(() => {
    if (!hasCoords) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (!window.google || !window.google.maps) {
      setError("Maps unavailable");
      return;
    }
    if (!containerRef.current) {
      return;
    }

    setError(null);
    setLoading(true);

    const position = { lat, lng };

    try {
      if (mode === "street") {
        streetViewRef.current = new window.google.maps.StreetViewPanorama(
          containerRef.current,
          {
            position,
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
          },
        );
      } else {
        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(containerRef.current, {
            center: position,
            zoom: 19,
            mapTypeId: "satellite",
            disableDefaultUI: true,
          });
        } else {
          mapRef.current.setCenter(position);
          mapRef.current.setZoom(19);
          mapRef.current.setMapTypeId("satellite");
        }

        if (!markerRef.current) {
          markerRef.current = new window.google.maps.Marker({
            position,
            map: mapRef.current,
          });
        } else {
          markerRef.current.setPosition(position);
          markerRef.current.setMap(mapRef.current);
        }
      }
    } catch (e) {
      setError("Failed to load map");
      console.error("MapPanel error", e);
    } finally {
      setLoading(false);
    }
  }, [hasCoords, lat, lng, mode]);

  const showPlaceholder = !hasCoords || error || loading;

  return (
    <div
      className={
        "relative rounded-lg border border-gray-700 bg-gray-800/40 " +
        (className || "")
      }
    >
      <div ref={containerRef} className="h-full w-full rounded-lg" />
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-900/60 text-sm text-gray-400">
          {!hasCoords
            ? "Select address to view"
            : error
              ? "Failed to load map"
              : "Loading map..."}
        </div>
      )}
    </div>
  );
}
