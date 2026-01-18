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
    <div className="flex flex-col h-full bg-ems-white border-l border-ems-gray p-4 gap-4">
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          View Controls
        </h3>

        <button
          onClick={() => setViewMode("satellite")}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            viewMode === "satellite"
              ? "bg-ems-blue/10 border-ems-blue text-ems-blue"
              : "bg-white border-gray-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span className="text-sm font-medium">Satellite</span>
          {viewMode === "satellite" && (
            <div className="w-2 h-2 bg-ems-blue rounded-full" />
          )}
        </button>

        <button
          onClick={() => setViewMode("street")}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
            viewMode === "street"
              ? "bg-green-50 border-green-500 text-green-600"
              : "bg-white border-gray-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span className="text-sm font-medium">Street View</span>
          {viewMode === "street" && (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          )}
        </button>
      </div>

      <div className="h-px bg-gray-200 my-2" />

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Operations
        </h3>

        {!connected && (
          <button
            onClick={onCreateIncident}
            disabled={!hasLocation || isCreatingIncident}
            className={`w-full p-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              !hasLocation
                ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                : isCreatingIncident
                  ? "bg-ems-red/10 text-ems-red cursor-wait border border-ems-red/20"
                  : "bg-ems-red hover:bg-red-600 text-white shadow-lg shadow-red-900/20 animate-pulse"
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
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              : isAnalyzing
                ? "bg-purple-50 text-purple-400 cursor-wait border border-purple-200"
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
        <div className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">
              SYSTEM ONLINE
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>GPS</span>
              <span className="text-green-600 font-bold">CONNECTED</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>LIVEKIT</span>
              <span className="text-green-600 font-bold">READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
