import React from "react";

export function RightPanel({
  viewMode,
  setViewMode,
  onAnalyze,
  isAnalyzing,
  hasLocation,
  connected,
  onCreateIncident,
  isCreatingIncident,
}) {
  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 p-4 gap-4">
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          View Controls
        </h3>

        <button
          onClick={() => setViewMode("satellite")}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            viewMode === "satellite"
              ? "bg-blue-900/30 border-blue-500 text-blue-400"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750"
          }`}
        >
          <span className="text-sm font-medium">Satellite</span>
          {viewMode === "satellite" && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setViewMode("street")}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            viewMode === "street"
              ? "bg-green-900/30 border-green-500 text-green-400"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750"
          }`}
        >
          <span className="text-sm font-medium">Street View</span>
          {viewMode === "street" && (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          )}
        </button>
      </div>

      <div className="h-px bg-gray-800 my-2" />

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Operations
        </h3>

        {!connected && (
          <button
            onClick={onCreateIncident}
            disabled={!hasLocation || isCreatingIncident}
            className={`w-full p-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              !hasLocation
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : isCreatingIncident
                  ? "bg-red-900/50 text-red-300 cursor-wait"
                  : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 animate-pulse"
            }`}
          >
            {isCreatingIncident ? (
              <>
                <span className="animate-spin">⟳</span> Connecting...
              </>
            ) : (
              <>
                <span>🚨</span> Connect Dispatch
              </>
            )}
          </button>
        )}

        <button
          onClick={onAnalyze}
          disabled={!hasLocation || isAnalyzing}
          className={`w-full p-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
            !hasLocation
              ? "bg-gray-800 text-gray-500 cursor-not-allowed"
              : isAnalyzing
                ? "bg-purple-900/50 text-purple-300 cursor-wait"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
          }`}
        >
          {isAnalyzing ? (
            <>
              <span className="animate-spin">⟳</span> Analyzing...
            </>
          ) : (
            <>
              <span>⚡</span> Analyze Scene
            </>
          )}
        </button>
      </div>

      <div className="mt-auto">
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-gray-300">
              SYSTEM ONLINE
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>GPS</span>
              <span className="text-green-500">CONNECTED</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>LIVEKIT</span>
              <span className="text-green-500">READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
