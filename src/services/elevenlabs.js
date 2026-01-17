const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export async function speakText(text) {
  if (!text) {
    return;
  }
  if (!API_KEY) {
    throw new Error("ElevenLabs API key missing");
  }
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error("ElevenLabs request failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await audio.play();
}

export function formatNotesForSpeech(address, notes) {
  const parts = [];
  if (address) {
    parts.push(`Approaching ${address}.`);
  }
  if (Array.isArray(notes)) {
    notes.forEach((note) => {
      if (!note || !note.content) {
        return;
      }
      const type = note.type || "general";
      let prefix;
      if (type === "hazard") {
        prefix = "Warning";
      } else if (type === "access") {
        prefix = "Access note";
      } else if (type === "parking") {
        prefix = "Parking note";
      } else if (type === "animal") {
        prefix = "Animal note";
      } else {
        prefix = "Note";
      }
      parts.push(`${prefix}: ${note.content}.`);
    });
  }
  return parts.join(" ");
}
