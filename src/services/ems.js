const API_BASE = import.meta.env.VITE_EMS_API_BASE || "http://localhost:8000";

export async function createEmsReportFromAudioBase64(
  audioBase64,
  aggressiveness,
) {
  const payload = {
    audio_base64: audioBase64,
  };
  if (typeof aggressiveness === "number") {
    payload.aggressiveness = aggressiveness;
  }

  const response = await fetch(`${API_BASE}/ems/intake`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("EMS report request failed");
  }

  const data = await response.json();
  return {
    transcription: data.transcription || "",
    compressed_text: data.compressed_text || "",
    ai_response: data.ai_response || "",
  };
}

export async function analyzeSceneFromSatellite(lat, lng, address) {
  const payload = {
    lat,
    lng,
    address: address || "",
  };

  const response = await fetch(`${API_BASE}/ems/scene-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Scene analysis request failed");
  }

  const data = await response.json();
  return data.analysis || "";
}
