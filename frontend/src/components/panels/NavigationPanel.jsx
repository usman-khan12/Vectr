import React from "react";
import { MapPanel } from "../MapPanel";

export function NavigationPanel({
  viewMode,
  location,
  pois,
  recommendedHeading,
  showPositioning,
}) {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-xl border border-gray-800 shadow-2xl">
      <MapPanel
        lat={location ? location.lat : null}
        lng={location ? location.lng : null}
        mode={viewMode}
        className="w-full h-full"
        pois={pois}
        recommendedHeading={recommendedHeading}
        autoNavigate={showPositioning && viewMode === "street"}
      />

      {/* Overlay Status */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md border border-gray-700 rounded-md shadow-lg">
          <span className="text-xs font-bold text-gray-200">
            {viewMode === "street" ? "STREET VIEW" : "SATELLITE LINK"}
          </span>
        </div>
        {location && (
          <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md border border-gray-700 rounded-md shadow-lg max-w-xs truncate">
            <span className="text-xs text-gray-300">{location.address}</span>
          </div>
        )}
      </div>
    </div>
  );
}
