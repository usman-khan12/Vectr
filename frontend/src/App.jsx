import { useEffect, useState } from "react";
import { EmergencyLayout } from "./components/layout/EmergencyLayout";
import AddNoteModal from "./components/AddNoteModal.jsx";
import { useNotes } from "./hooks/useNotes.js";
import { analyzeSceneFromSatellite } from "./services/ems.js";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

export default function App() {
  const [location, setLocation] = useState(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [sceneAnalysis, setSceneAnalysis] = useState("");
  const [positioningGuidance, setPositioningGuidance] = useState("");
  const [emsReport, setEmsReport] = useState(null);
  // Ghost Navigator state
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
      // Set structured data
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
    <>
      <EmergencyLayout
        location={location}
        setLocation={setLocation}
        handleOpenGoogleMaps={handleOpenGoogleMaps}
        handleOpenWaze={handleOpenWaze}
        pois={pois}
        recommendedHeading={recommendedHeading}
        showPositioning={showPositioning}
        positioningGuidance={positioningGuidance}
        sceneAnalysis={sceneAnalysis}
        handleAnalyzeScene={handleAnalyzeScene}
        sceneLoading={sceneLoading}
        roomToken={roomToken}
        liveKitUrl={LIVEKIT_URL}
        handleCreateIncident={handleCreateIncident}
        incidentLoading={incidentLoading}
        notes={notes}
        loadingNotes={notesLoading}
        onAddNote={() => setShowAddNote(true)}
      />
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
    </>
  );
}
