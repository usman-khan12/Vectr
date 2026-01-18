import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useDataChannel,
} from "@livekit/components-react";

function AgentStatusDisplay({ state, audioTrack }) {
  return (
    <div className="flex items-center gap-4 bg-gray-900/50 rounded-lg p-2 border border-gray-700">
      <div
        className={`w-3 h-3 rounded-full ${
          state === "speaking"
            ? "bg-green-500 animate-pulse"
            : state === "listening"
              ? "bg-blue-500 animate-pulse"
              : "bg-gray-500"
        }`}
      />

      <div className="flex flex-col">
        <span className="text-xs font-bold text-gray-300 uppercase">
          {state === "speaking"
            ? "VECTR SPEAKING"
            : state === "listening"
              ? "LISTENING"
              : "STANDBY"}
        </span>
        <span className="text-[10px] text-gray-500">VOICE CHANNEL ACTIVE</span>
      </div>

      {state === "speaking" && audioTrack && (
        <div className="h-8 w-24">
          <BarVisualizer
            state={state}
            barCount={7}
            trackRef={audioTrack}
            className="h-full w-full"
          />
        </div>
      )}
    </div>
  );
}

function BaseTranscriptionPanel({
  notes,
  loadingNotes,
  onAddNote,
  connected,
  sceneAnalysis,
  latestUpdate,
  voiceState,
  audioTrack,
}) {
  const [noteInput, setNoteInput] = useState("");

  const handleNoteKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const value = noteInput.trim();
      if (!value || !onAddNote) return;
      onAddNote(value);
      setNoteInput("");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 h-full gap-4 bg-gray-950 p-4 border-t border-gray-800 overflow-hidden">
      {/* Left: Live Transcription / Agent */}
      <div className="lg:col-span-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span>🔴</span> Live Feed
          </h3>
          {connected && (
            <AgentStatusDisplay state={voiceState} audioTrack={audioTrack} />
          )}
        </div>

        <div className="flex-1 bg-gray-900 rounded-lg border border-gray-800 p-4 overflow-y-auto relative">
          {/* Placeholder for transcription text if we had it separately, otherwise AgentStatus is the main indicator */}
          {connected && <RoomAudioRenderer />}

          <div className="space-y-3">
            <div className="text-sm text-gray-400 italic text-center mt-10">
              {connected
                ? "Listening for emergency communications..."
                : "System disconnected."}
            </div>
            {latestUpdate && (
              <div className="mt-2 p-2 bg-blue-900/30 border border-blue-500/30 rounded animate-fade-in">
                <div className="text-[11px] font-bold text-blue-400 mb-1">
                  LIVE UPDATE
                </div>
                <ReactMarkdown className="text-sm text-gray-200 leading-relaxed">
                  {latestUpdate}
                </ReactMarkdown>
              </div>
            )}
            {sceneAnalysis && (
              <div className="mt-4 p-2 bg-purple-900/20 border border-purple-500/30 rounded">
                <div className="text-[11px] font-bold text-purple-400 mb-1">
                  SCENE INTELLIGENCE
                </div>
                <ReactMarkdown className="text-sm text-gray-300 leading-relaxed">
                  {sceneAnalysis}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Notes Interface */}
      <div className="lg:col-span-2 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span>📝</span> Operational Notes
          </h3>
        </div>

        <div className="mb-3">
          <textarea
            value={noteInput}
            onChange={(event) => setNoteInput(event.target.value)}
            onKeyDown={handleNoteKeyDown}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Type operational note and press Enter to generate structured report"
            rows={2}
          />
        </div>

        <div className="flex-1 bg-gray-900 rounded-lg border border-gray-800 p-4 overflow-y-auto">
          {loadingNotes ? (
            <div className="text-center text-sm text-gray-500 py-10">
              Syncing notes...
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-gray-800/50 p-3 rounded border-l-2 border-blue-500"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-gray-400">
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                      {note.author || "SYSTEM"}
                    </span>
                  </div>
                  <ReactMarkdown className="text-sm text-gray-200 leading-relaxed">
                    {note.content || ""}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500 py-10">
              No notes recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConnectedTranscriptionPanel({
  notes,
  loadingNotes,
  onAddNote,
  sceneAnalysis,
}) {
  const [latestUpdate, setLatestUpdate] = useState(null);
  const { state, audioTrack } = useVoiceAssistant();

  useDataChannel("*", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === "scene_update") {
        setLatestUpdate(data.data?.summary || "Scene updated");
      }
    } catch (e) {
      console.error("Data channel parse error:", e);
    }
  });

  return (
    <BaseTranscriptionPanel
      notes={notes}
      loadingNotes={loadingNotes}
      onAddNote={onAddNote}
      connected
      sceneAnalysis={sceneAnalysis}
      latestUpdate={latestUpdate}
      voiceState={state}
      audioTrack={audioTrack}
    />
  );
}

export function TranscriptionPanel({
  notes,
  loadingNotes,
  onAddNote,
  sceneAnalysis,
}) {
  return (
    <BaseTranscriptionPanel
      notes={notes}
      loadingNotes={loadingNotes}
      onAddNote={onAddNote}
      connected={false}
      sceneAnalysis={sceneAnalysis}
      latestUpdate={null}
      voiceState="standby"
      audioTrack={null}
    />
  );
}
