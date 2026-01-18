import React, { useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { AmbulancePanel } from "../panels/AmbulancePanel";
import { NavigationPanel } from "../panels/NavigationPanel";
import { RightPanel } from "../panels/RightPanel";
import {
  TranscriptionPanel,
  ConnectedTranscriptionPanel,
} from "../panels/TranscriptionPanel";
import AddressBar from "../AddressBar";

export function EmergencyLayout({
  // State from App.jsx
  location,
  setLocation,
  handleOpenGoogleMaps,
  handleOpenWaze,
  pois,
  recommendedHeading,
  showPositioning,
  positioningGuidance,
  sceneAnalysis,
  handleAnalyzeScene,
  sceneLoading,

  // LiveKit / Incident
  roomToken,
  liveKitUrl,
  handleCreateIncident,
  incidentLoading,

  // Notes
  notes,
  loadingNotes,
  onAddNote,
}) {
  const [viewMode, setViewMode] = useState("satellite"); // 'satellite' | 'street'

  const hasLocation =
    !!location &&
    typeof location.lat === "number" &&
    typeof location.lng === "number";

  return (
    <div className="flex flex-col h-screen w-screen bg-ems-white text-slate-900 overflow-hidden font-sans selection:bg-ems-blue/30">
      {/* Header */}
      <header className="flex-none bg-ems-blue border-b border-ems-blue-light flex items-center px-4 py-1 gap-3 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ems-red rounded flex items-center justify-center font-bold text-lg shadow-black/20 shadow-lg text-white">
            V
          </div>
          <span className="font-bold tracking-wider text-white hidden md:block">
            VECTR{" "}
            <span className="text-blue-200 text-xs font-normal">DISPATCH</span>
          </span>
        </div>

        <div className="flex-1 max-w-2xl mx-auto">
          <AddressBar
            onAddressSelect={setLocation}
            className="w-full bg-ems-blue-light border-blue-400 text-white placeholder-blue-200 text-sm focus:ring-ems-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenGoogleMaps}
            disabled={!hasLocation}
            className="hidden md:flex px-3 py-1.5 bg-ems-blue-light hover:bg-blue-600 disabled:opacity-50 text-xs rounded border border-blue-400 text-white transition-colors"
          >
            Maps
          </button>
          <div className="w-px h-6 bg-blue-400 mx-2" />
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-white">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-[10px] text-blue-200">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-[2] flex min-h-0 overflow-hidden">
        {/* Left Panel: Ambulance & Positioning */}
        <div className="w-80 flex-none z-10 hidden md:block shadow-xl shadow-black/20">
          <AmbulancePanel positioningGuidance={positioningGuidance} />
        </div>

        {/* Center: Map */}
        <div className="flex-1 relative z-0">
          <NavigationPanel
            viewMode={viewMode}
            location={location}
            pois={pois}
            recommendedHeading={recommendedHeading}
            showPositioning={showPositioning}
          />
        </div>

        {/* Right Panel: Controls */}
        <div className="w-64 flex-none z-10 hidden lg:block shadow-xl shadow-black/20">
          <RightPanel
            viewMode={viewMode}
            setViewMode={setViewMode}
            onAnalyze={handleAnalyzeScene}
            isAnalyzing={sceneLoading}
            hasLocation={hasLocation}
            connected={!!roomToken}
            onCreateIncident={handleCreateIncident}
            isCreatingIncident={incidentLoading}
          />
        </div>
      </div>

      <div className="flex-[1] z-20 min-h-0 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] overflow-hidden">
        {roomToken ? (
          <LiveKitRoom
            serverUrl={liveKitUrl}
            token={roomToken}
            connect={true}
            audio={true}
            video={false}
            data-lk-theme="default"
            style={{ height: "100%" }}
          >
            <ConnectedTranscriptionPanel
              notes={notes}
              loadingNotes={loadingNotes}
              onAddNote={onAddNote}
              sceneAnalysis={sceneAnalysis}
            />
          </LiveKitRoom>
        ) : (
          <TranscriptionPanel
            notes={notes}
            loadingNotes={loadingNotes}
            onAddNote={onAddNote}
            sceneAnalysis={sceneAnalysis}
          />
        )}
      </div>
    </div>
  );
}
