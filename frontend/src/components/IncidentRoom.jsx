import React, { useState, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
  useDataChannel,
} from "@livekit/components-react";
import "@livekit/components-styles";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

// Voice assistant status display
function AgentStatus() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
      <div
        className={`w-3 h-3 rounded-full ${
          state === "speaking"
            ? "bg-green-500 animate-pulse"
            : state === "listening"
              ? "bg-blue-500 animate-pulse"
              : "bg-gray-500"
        }`}
      />
      <span className="text-sm text-gray-300">
        {state === "speaking"
          ? "🔊 VECTR Speaking..."
          : state === "listening"
            ? "🎤 Listening..."
            : "⏸️ VECTR Standby"}
      </span>
      {audioTrack && state === "speaking" && (
        <BarVisualizer
          state={state}
          barCount={5}
          trackRef={audioTrack}
          className="h-6 w-24"
        />
      )}
    </div>
  );
}

// Inner component that uses LiveKit hooks
function RoomContent({ sceneAnalysis, positioningGuidance, onSceneUpdate }) {
  const [latestUpdate, setLatestUpdate] = useState(null);

  // Listen for data channel messages
  useDataChannel("*", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === "scene_update") {
        setLatestUpdate(data.data?.summary || "Scene updated");
        onSceneUpdate?.(data.data);
      }
    } catch (e) {
      console.error("Data channel parse error:", e);
    }
  });

  return (
    <div className="space-y-4">
      {/* Agent Status */}
      <AgentStatus />

      {/* Scene Intelligence Card */}
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
          <span>🛰️</span> Scene Intelligence
        </h3>
        <div className="text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
          {sceneAnalysis || "Awaiting scene analysis..."}
        </div>
      </div>

      {/* Positioning Card */}
      <div className="p-4 bg-gray-900 rounded-lg border border-amber-700/50">
        <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
          <span>🚑</span> Positioning Guide
        </h3>
        <div className="text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
          {positioningGuidance || "Awaiting positioning guidance..."}
        </div>
      </div>

      {/* Latest Update */}
      {latestUpdate && (
        <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
          <div className="text-xs text-blue-300">
            <span className="font-semibold">📢 Update:</span> {latestUpdate}
          </div>
        </div>
      )}

      {/* Audio renderer - makes agent audible */}
      <RoomAudioRenderer />
    </div>
  );
}

export default function IncidentRoom({
  token,
  roomName,
  onDisconnect,
  sceneAnalysis,
  positioningGuidance,
}) {
  const [connected, setConnected] = useState(false);
  const [sceneData, setSceneData] = useState({
    analysis: sceneAnalysis,
    positioning: positioningGuidance,
  });

  const handleConnect = useCallback(() => {
    setConnected(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnected(false);
    onDisconnect?.();
  }, [onDisconnect]);

  if (!token) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-gray-400 text-center">
        <div className="text-2xl mb-2">📡</div>
        <div>Create an incident to join the voice room.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Connection Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`}
          />
          <span className="text-sm text-gray-300">
            {connected ? `Connected: ${roomName}` : "Connecting..."}
          </span>
        </div>
        {connected && (
          <button
            onClick={onDisconnect}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* LiveKit Room */}
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={token}
        connect={true}
        onConnected={handleConnect}
        onDisconnected={handleDisconnect}
        audio={true}
        video={false}
      >
        <RoomContent
          sceneAnalysis={sceneData.analysis}
          positioningGuidance={sceneData.positioning}
          onSceneUpdate={(data) =>
            setSceneData((prev) => ({ ...prev, ...data }))
          }
        />
      </LiveKitRoom>
    </div>
  );
}
