import { useEffect, useState } from "react";
import IncidentRoom from "./components/IncidentRoom";
import AddressBar from "./components/AddressBar.jsx";
import { MapPanel } from "./components/MapPanel.jsx";
import NotesPanel from "./components/NotesPanel.jsx";
import AddNoteModal from "./components/AddNoteModal.jsx";
import VoiceIntakePanel from "./components/VoiceIntakePanel.jsx";
import { useNotes } from "./hooks/useNotes.js";
import { analyzeSceneFromSatellite } from "./services/ems.js";

export default function App() {
  const [location, setLocation] = useState(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [sceneAnalysis, setSceneAnalysis] = useState("");
  const [positioningGuidance, setPositioningGuidance] = useState("");
  const [emsReport, setEmsReport] = useState(null);
  // NEW: Ghost Navigator state
  const [pois, setPois] = useState([]);
  const [recommendedHeading, setRecommendedHeading] = useState(null);

  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState(null);
  const [showPositioning, setShowPositioning] = useState(false);

  // Incident Room State
  const [incidentRoom, setIncidentRoom] = useState(null);
  const [roomToken, setRoomToken] = useState(null);
  const [incidentLoading, setIncidentLoading] = useState(false);

  const {
    notes,
    loading: notesLoading,
    error: notesError,
    addNote,
  } = useNotes(location ? location.address : null);

  const handleAddressSelect = (nextLocation) => {
    setLocation(nextLocation);
  };

  useEffect(() => {
    setSceneAnalysis("");
    setPositioningGuidance("");
    setEmsReport(null);
    setPois([]);
    setRecommendedHeading(null);
    setSceneError(null);
    setSceneLoading(false);
    setShowPositioning(false);
  }, [location ? location.address : null]);

  const handleOpenGoogleMaps = () => {
    if (!location) return;
    const hasCoords =
      typeof location.lat === "number" && typeof location.lng === "number";
    let url = null;
    if (hasCoords) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${location.lat},${location.lng}`)}`;
    } else if (location.address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`;
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenWaze = () => {
    if (!location) return;
    const hasCoords =
      typeof location.lat === "number" && typeof location.lng === "number";
    let url = null;
    if (hasCoords) {
      url = `https://waze.com/ul?ll=${encodeURIComponent(`${location.lat},${location.lng}`)}&navigate=yes`;
    } else if (location.address) {
      url = `https://waze.com/ul?q=${encodeURIComponent(location.address)}&navigate=yes`;
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const hasLocation =
    !!location &&
    typeof location.lat === "number" &&
    typeof location.lng === "number";

  const handleAnalyzeScene = async () => {
    if (!hasLocation || !location) return;
    setSceneError(null);
    setSceneLoading(true);
    try {
      const result = await analyzeSceneFromSatellite(
        location.lat,
        location.lng,
        location.address || "",
      );
      setSceneAnalysis(result.analysis);
      setPositioningGuidance(result.positioning_guidance);
      // NEW: Set structured data
      setPois(result.pois || []);
      setRecommendedHeading(result.recommendedHeading || 0);

      setShowPositioning(true);
    } catch (error) {
      setSceneError("Failed to analyze scene");
    } finally {
      setSceneLoading(false);
    }
  };

  const handleCreateIncident = async () => {
    if (!hasLocation || !location) return;
    setIncidentLoading(true);

    try {
      // Use existing endpoint structure but now it also creates the room
      const response = await fetch("http://localhost:8000/incident/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_id: Date.now().toString(),
          address: location.address,
          lat: location.lat,
          lng: location.lng,
          caller_notes: "Dispatch initiated via VECTR web",
        }),
      });

      if (!response.ok) throw new Error("Failed to create incident");

      const data = await response.json();
      setIncidentRoom(data.room_name);
      setRoomToken(data.token_dispatcher);
      setSceneAnalysis(data.scene_analysis);
      setPositioningGuidance(data.positioning_guidance);
      setEmsReport(data.ems_report);
      setShowPositioning(true);
    } catch (e) {
      console.error(e);
      alert("Failed to create incident room");
    } finally {
      setIncidentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        <header className="flex items-center gap-4">
          <div className="text-2xl font-bold tracking-widest text-blue-400">
            VECTR
          </div>
          <div className="flex-1">
            <AddressBar
              onAddressSelect={handleAddressSelect}
              className="w-full"
            />
          </div>
          <div className="flex min-w-[260px] flex-col items-end gap-1 text-right">
            <div className="max-w-xs">
              {location ? (
                <>
                  <div className="truncate text-sm font-semibold text-gray-100">
                    {location.address}
                  </div>
                  <div className="text-xs text-gray-400">
                    {hasLocation
                      ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                      : "Location selected"}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">
                  Select an address to begin
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenGoogleMaps}
                disabled={!location}
                className={
                  "min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 " +
                  (!location
                    ? "cursor-not-allowed bg-gray-700 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700")
                }
              >
                Open in Google Maps
              </button>
              <button
                type="button"
                onClick={handleOpenWaze}
                disabled={!location}
                className={
                  "min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 " +
                  (!location
                    ? "cursor-not-allowed bg-gray-700 text-gray-500"
                    : "bg-indigo-600 text-white hover:bg-indigo-700")
                }
              >
                Open in Waze
              </button>
            </div>
          </div>
        </header>

        <main className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Street View with Positioning Overlay */}
            <div className="relative h-64 lg:h-72">
              <MapPanel
                lat={location ? location.lat : null}
                lng={location ? location.lng : null}
                mode="street"
                className="h-full w-full"
                pois={pois}
                recommendedHeading={recommendedHeading}
                autoNavigate={showPositioning}
              />
              {showPositioning && positioningGuidance && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-3 py-1">
                    <span className="text-xs text-green-400 font-medium">
                      ↑ APPROACH
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
                    <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-8 pb-3 px-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-amber-400 text-lg">🚑</span>
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                              Positioning
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-200 leading-tight max-h-16 overflow-y-auto pr-2">
                            {positioningGuidance
                              .split("\n")
                              .slice(0, 3)
                              .join(" • ")}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPositioning(false)}
                          className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-800/50"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {!showPositioning && positioningGuidance && (
                <button
                  type="button"
                  onClick={() => setShowPositioning(true)}
                  className="absolute bottom-3 left-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1"
                >
                  🚑 Show Positioning
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="h-64 lg:h-72">
                <MapPanel
                  lat={location ? location.lat : null}
                  lng={location ? location.lng : null}
                  mode="satellite"
                  className="h-full w-full"
                />
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-3 text-xs text-gray-200">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-200">
                      AI Scene Analysis
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Satellite-based parking, approach routes, and hazards.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyzeScene}
                    disabled={!hasLocation || sceneLoading}
                    className={
                      "min-h-[32px] rounded-md px-3 py-1 text-[11px] font-medium transition-colors duration-150 " +
                      (!hasLocation || sceneLoading
                        ? "cursor-not-allowed bg-gray-700 text-gray-500"
                        : "bg-purple-600 text-white hover:bg-purple-700")
                    }
                  >
                    {sceneLoading ? "Analyzing..." : "Analyze Scene"}
                  </button>
                </div>
                {sceneError && (
                  <div className="mb-1 rounded-md border border-red-700 bg-red-900/40 px-2 py-1 text-[11px] text-red-200">
                    {sceneError}
                  </div>
                )}
                <div className="max-h-36 overflow-y-auto whitespace-pre-wrap text-[11px] leading-snug">
                  {sceneAnalysis ||
                    "Run analysis to see AI guidance on approach routes, parking, and hazards for this address."}
                </div>
              </div>
            </div>
          </div>

          {/* Full Positioning Panel */}
          {positioningGuidance && (
            <section className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🚑</span>
                <div>
                  <div className="text-sm font-semibold text-amber-400">
                    Ambulance Positioning Guide
                  </div>
                  <div className="text-xs text-amber-200/70">
                    AI-generated from street view analysis
                  </div>
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {positioningGuidance}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-200">
                Incident Voice Command
              </h2>
              {!incidentRoom && (
                <button
                  onClick={handleCreateIncident}
                  disabled={!hasLocation || incidentLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !hasLocation || incidentLoading
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  }`}
                >
                  {incidentLoading
                    ? "Creating Incident..."
                    : "🚨 Create Incident & Join Voice"}
                </button>
              )}
            </div>

            <IncidentRoom
              token={roomToken}
              roomName={incidentRoom}
              sceneAnalysis={sceneAnalysis}
              positioningGuidance={positioningGuidance}
              onDisconnect={() => {
                setIncidentRoom(null);
                setRoomToken(null);
              }}
            />
          </section>

          <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
            <VoiceIntakePanel
              address={location ? location.address : ""}
              disabled={!location}
              initialReport={emsReport}
              onSaveReport={async (reportText) => {
                if (location && reportText)
                  await addNote("general", reportText);
              }}
            />
          </section>

          <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
            <NotesPanel
              address={location ? location.address : ""}
              notes={notes || []}
              loading={notesLoading}
              error={notesError}
              onAddNote={() => setShowAddNote(true)}
            />
          </section>
        </main>

        {showAddNote && location && (
          <AddNoteModal
            address={location.address}
            onClose={() => setShowAddNote(false)}
            onSave={async (type, content) => {
              await addNote(type, content);
              setShowAddNote(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
