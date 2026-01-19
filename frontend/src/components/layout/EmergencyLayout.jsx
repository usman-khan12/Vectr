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

  notes,
  loadingNotes,
  onAddNote,
}) {
  const [viewMode, setViewMode] = useState("satellite");
  const [transcriptionPanelMode, setTranscriptionPanelMode] =
    useState("default");

  const cycleTranscriptionPanelMode = () => {
    setTranscriptionPanelMode((prev) => {
      if (prev === "default") return "maximized";
      if (prev === "maximized") return "minimized";
      return "default";
    });
  };

  const handleToggleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cycleTranscriptionPanelMode();
    }
  };

  const mainSectionClassName =
    "flex min-h-0 overflow-hidden transition-all duration-300 " +
    (transcriptionPanelMode === "maximized"
      ? "flex-[0.25]"
      : transcriptionPanelMode === "minimized"
        ? "flex-[2.9]"
        : "flex-[2]");

  const transcriptionSectionClassName =
    "relative z-20 min-h-0 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] overflow-y-auto transition-all duration-300 " +
    (transcriptionPanelMode === "maximized"
      ? "flex-[2.75]"
      : transcriptionPanelMode === "minimized"
        ? "flex-[0.1]"
        : "flex-[1]");

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

      <div className={mainSectionClassName}>
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

      <div className={transcriptionSectionClassName}>
        <div className="absolute left-1/2 -top-4 -translate-x-1/2 bottom-0 z-30 translate-y-5">
          <button
            type="button"
            onClick={cycleTranscriptionPanelMode}
            onKeyDown={handleToggleKeyDown}
            aria-label={
              transcriptionPanelMode === "maximized"
                ? "Minimize live feed and operational notes panel"
                : transcriptionPanelMode === "minimized"
                  ? "Restore live feed and operational notes panel"
                  : "Expand live feed and operational notes panel"
            }
            aria-expanded={transcriptionPanelMode !== "minimized"}
            aria-controls="transcription-panel"
            className="flex items-center gap-2 rounded-full bg-ems-blue text-ems-white text-xs px-6 py-1.5 border border-ems-blue-light shadow-lg focus:outline-none focus:ring-2 focus:ring-ems-red"
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-full bg-ems-red text-white w-5 h-5">
                <span className="material-symbols-outlined text-[16px] leading-none">
                  graphic_eq
                </span>
              </span>
              <span className="font-semibold tracking-wide">
                Live Feed &amp; Notes
              </span>
            </span>
            <span className="material-symbols-outlined text-base leading-none">
              {transcriptionPanelMode === "maximized"
                ? "expand_more"
                : transcriptionPanelMode === "minimized"
                  ? "expand_less"
                  : "open_in_full"}
            </span>
          </button>
        </div>
        <div id="transcription-panel" className="h-full">
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
    </div>
  );
}
