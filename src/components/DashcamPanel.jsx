import { useEffect, useRef, useState } from "react";
import { analyzeFrame, captureFrame } from "../services/overshoot.js";

export default function DashcamPanel() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [active, setActive] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera unavailable");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      streamRef.current = stream;
      setError(null);
      setActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          analyzeCurrentFrame();
        }, 2000);
      }
    } catch (err) {
      console.error("Dashcam start error", err);
      setError("Unable to access camera");
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setActive(false);
    setAnalyzing(false);
  };

  const analyzeCurrentFrame = async () => {
    if (!videoRef.current || analyzing) {
      return;
    }
    try {
      setAnalyzing(true);
      const frame = captureFrame(videoRef.current);
      const result = await analyzeFrame(frame);
      setAnnotations(result.detections || []);
      setError(null);
    } catch (err) {
      console.error("Dashcam analysis error", err);
      setError("Analysis unavailable");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex h-64 flex-col rounded-lg border border-gray-700 bg-gray-800/40">
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <span>Dashcam / Overshoot</span>
        {active && (
          <button
            type="button"
            onClick={stopCamera}
            className="min-h-[32px] rounded-md bg-red-600 px-3 py-1 text-[10px] font-medium text-white transition-colors duration-150 hover:bg-red-700"
          >
            Stop
          </button>
        )}
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 py-3 text-sm text-gray-500">
        {!active ? (
          <button
            type="button"
            onClick={startCamera}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
          >
            📷 Start Dashcam
          </button>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full rounded-lg object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-black/70 px-3 py-2 text-xs text-gray-100">
              {analyzing && <div>Analyzing...</div>}
              {error && <div className="text-red-400">{error}</div>}
              {!analyzing && !error && annotations.length === 0 && (
                <div>No annotations yet.</div>
              )}
              {annotations.map((item, index) => (
                <div key={index}>{item.description || String(item)}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
