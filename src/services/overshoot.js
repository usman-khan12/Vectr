const API_KEY = import.meta.env.VITE_OVERSHOOT_API_KEY;

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("Invalid data URL");
  }
  const meta = parts[0];
  const data = parts[1];
  const isBase64 = meta.includes("base64");
  const mimeMatch = meta.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  let binaryString;
  if (isBase64) {
    binaryString = atob(data);
  } else {
    binaryString = decodeURIComponent(data);
  }
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let index = 0; index < len; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export async function analyzeFrame(imageDataUrl) {
  if (!API_KEY) {
    throw new Error("Overshoot API key missing");
  }
  const blob = dataUrlToBlob(imageDataUrl);
  const formData = new FormData();
  formData.append("image", blob, "frame.jpg");
  formData.append(
    "prompt",
    "Identify driveways, gates, steep grades, obstacles, and house numbers"
  );

  const response = await fetch("https://api.overshoot.example/analyze", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error("Overshoot API request failed");
  }

  const data = await response.json();
  return {
    detections: Array.isArray(data.detections) ? data.detections : []
  };
}

export function captureFrame(videoElement) {
  if (!videoElement) {
    throw new Error("Video element required");
  }
  const width = videoElement.videoWidth;
  const height = videoElement.videoHeight;
  if (!width || !height) {
    throw new Error("Video not ready");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(videoElement, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.8);
}
