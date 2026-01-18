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
    <div className="flex flex-col h-screen w-screen bg-gray-950 text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="flex-none h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg shadow-blue-900/50 shadow-lg">
            V
          </div>
          <span className="font-bold tracking-wider text-gray-100 hidden md:block">
            VECTR{" "}
            <span className="text-blue-500 text-xs font-normal">DISPATCH</span>
          </span>
        </div>

        <div className="flex-1 max-w-2xl mx-auto">
          <AddressBar
            onAddressSelect={setLocation}
            className="w-full bg-gray-800 border-gray-700 text-sm focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenGoogleMaps}
            disabled={!hasLocation}
            className="hidden md:flex px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs rounded border border-gray-700 transition-colors"
          >
            Maps
          </button>
          <div className="w-px h-6 bg-gray-800 mx-2" />
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-300">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-[10px] text-gray-500">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Ambulance & Positioning */}
        <div className="w-80 flex-none z-10 hidden md:block shadow-xl shadow-black/50">
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
        <div className="w-64 flex-none z-10 hidden lg:block shadow-xl shadow-black/50">
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

      {/* Bottom Panel: Transcription & Notes */}
      <div className="h-64 flex-none z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
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
