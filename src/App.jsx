import { useEffect, useState } from "react";
import AddressBar from "./components/AddressBar.jsx";
import MapPanel from "./components/MapPanel.jsx";
import NotesPanel from "./components/NotesPanel.jsx";
import AddNoteModal from "./components/AddNoteModal.jsx";
import VoiceIntakePanel from "./components/VoiceIntakePanel.jsx";
import { useNotes } from "./hooks/useNotes.js";
import { analyzeSceneFromSatellite } from "./services/ems.js";

export default function App() {
  const [location, setLocation] = useState(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [sceneAnalysis, setSceneAnalysis] = useState("");
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState(null);
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
    setSceneError(null);
    setSceneLoading(false);
  }, [location ? location.address : null]);

  const handleOpenGoogleMaps = () => {
    if (!location) {
      return;
    }
    const hasCoords =
      typeof location.lat === "number" && typeof location.lng === "number";
    let url = null;
    if (hasCoords) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${location.lat},${location.lng}`,
      )}`;
    } else if (location.address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        location.address,
      )}`;
    }
    if (url && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenWaze = () => {
    if (!location) {
      return;
    }
    const hasCoords =
      typeof location.lat === "number" && typeof location.lng === "number";
    let url = null;
    if (hasCoords) {
      url = `https://waze.com/ul?ll=${encodeURIComponent(
        `${location.lat},${location.lng}`,
      )}&navigate=yes`;
    } else if (location.address) {
      url = `https://waze.com/ul?q=${encodeURIComponent(
        location.address,
      )}&navigate=yes`;
    }
    if (url && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const hasLocation =
    !!location &&
    typeof location.lat === "number" &&
    typeof location.lng === "number";

  const handleAnalyzeScene = async () => {
    if (!hasLocation || !location) {
      return;
    }
    setSceneError(null);
    setSceneLoading(true);
    try {
      const analysis = await analyzeSceneFromSatellite(
        location.lat,
        location.lng,
        location.address || "",
      );
      setSceneAnalysis(analysis);
    } catch (error) {
      setSceneError("Failed to analyze scene");
    } finally {
      setSceneLoading(false);
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
            <div className="h-64 lg:h-72">
              <MapPanel
                lat={location ? location.lat : null}
                lng={location ? location.lng : null}
                mode="street"
                className="h-full w-full"
              />
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
                  {sceneAnalysis
                    ? sceneAnalysis
                    : "Run analysis to see AI guidance on approach routes, parking, and hazards for this address."}
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
            <VoiceIntakePanel
              address={location ? location.address : ""}
              disabled={!location}
              onSaveReport={async (reportText) => {
                if (!location || !reportText) {
                  return;
                }
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
