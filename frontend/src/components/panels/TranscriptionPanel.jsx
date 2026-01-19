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
    <div className="flex items-center gap-4 bg-ems-blue/10 rounded-lg p-2 border border-ems-blue-light">
      <div
        className={`w-3 h-3 rounded-full ${
          state === "speaking"
            ? "bg-ems-red animate-pulse"
            : state === "listening"
              ? "bg-ems-blue-light animate-pulse"
              : "bg-ems-gray"
        }`}
      />

      <div className="flex flex-col">
        <span className="text-xs font-bold text-ems-gray uppercase">
          {state === "speaking"
            ? "VECTR SPEAKING"
            : state === "listening"
              ? "LISTENING"
              : "STANDBY"}
        </span>
        <span className="text-[10px] text-ems-gray/80">
          VOICE CHANNEL ACTIVE
        </span>
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
  const [unionLoading, setUnionLoading] = useState(false);
  const [unionError, setUnionError] = useState(null);
  const [unionSuccess, setUnionSuccess] = useState(null);

  const handleNoteKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const value = noteInput.trim();
      if (!value || !onAddNote) return;
      onAddNote(value);
      setNoteInput("");
    }
  };

  const handleUnionNotes = async () => {
    if (!notes || !onAddNote) {
      return;
    }

    setUnionLoading(true);
    setUnionError(null);
    setUnionSuccess(null);

    try {
      const systemNotes = notes
        .filter((note) => !note.author || note.author === "SYSTEM")
        .sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return aTime - bTime;
        });

      if (systemNotes.length === 0) {
        setUnionError("No system notes available to union.");
        return;
      }

      const unionContentHeader = "Union Summary of System Notes\n\n";
      const unionContentBody = systemNotes
        .map((note, index) => {
          const timeLabel = note.timestamp
            ? new Date(note.timestamp).toLocaleTimeString()
            : "";
          const prefix = `${index + 1}. ${timeLabel ? `[${timeLabel}] ` : ""}`;
          const content = note.content || "";
          return `${prefix}${content}`;
        })
        .join("\n\n");

      const unionContent = unionContentHeader + unionContentBody;

      const result = onAddNote(unionContent);
      if (result && typeof result.then === "function") {
        await result;
      }

      setUnionSuccess("Union summary note generated.");
    } catch (error) {
      console.error("Union notes error", error);
      setUnionError("Unable to generate union summary.");
    } finally {
      setUnionLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 h-full gap-4 bg-slate-950 p-4 border-t border-ems-blue-light overflow-y-auto">
      <div className="lg:col-span-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ems-gray uppercase tracking-wider flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full bg-ems-red text-white w-6 h-6">
              <span className="material-symbols-outlined text-[18px] leading-none">
                fiber_manual_record
              </span>
            </span>
            <span>Live Feed</span>
          </h3>
          {connected && (
            <AgentStatusDisplay state={voiceState} audioTrack={audioTrack} />
          )}
        </div>

        <div className="flex-1 bg-ems-blue/20 rounded-lg border border-ems-blue-light p-4 overflow-y-auto relative">
          {connected && <RoomAudioRenderer />}

          <div className="space-y-3">
            <div className="text-sm text-ems-gray italic text-center mt-10">
              {connected
                ? "Listening for emergency communications..."
                : "System disconnected."}
            </div>
            {latestUpdate && (
              <div className="mt-2 p-3 bg-ems-blue-light/20 border border-ems-blue-light rounded animate-fade-in">
                <div className="text-[11px] font-bold text-ems-blue-light mb-1">
                  LIVE UPDATE
                </div>
                <ReactMarkdown className="text-sm text-ems-white leading-relaxed">
                  {latestUpdate}
                </ReactMarkdown>
              </div>
            )}
            {sceneAnalysis && (
              <div className="mt-4 p-3 bg-ems-blue/10 border border-ems-blue-light rounded">
                <div className="text-[11px] font-bold text-ems-blue-light mb-1">
                  SCENE INTELLIGENCE
                </div>
                <ReactMarkdown className="text-sm text-ems-white leading-relaxed">
                  {sceneAnalysis}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-ems-gray uppercase tracking-wider flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full bg-ems-blue-light text-white w-6 h-6">
              <span className="material-symbols-outlined text-[18px] leading-none">
                note_alt
              </span>
            </span>
            <span>Notes</span>
          </h3>
          <button
            type="button"
            onClick={handleUnionNotes}
            disabled={unionLoading || !notes || notes.length === 0}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 " +
              (unionLoading || !notes || notes.length === 0
                ? "cursor-not-allowed bg-ems-gray/40 text-slate-800"
                : "bg-ems-blue-light text-white hover:bg-ems-blue active:bg-ems-blue")
            }
            aria-busy={unionLoading}
          >
            {unionLoading ? "Unioning..." : "Union Notes"}
          </button>
        </div>

        {unionError && (
          <div className="mb-2 text-xs text-ems-red" role="alert">
            {unionError}
          </div>
        )}

        {unionSuccess && (
          <div
            className="mb-2 text-xs text-ems-blue-light"
            role="status"
            aria-live="polite"
          >
            {unionSuccess}
          </div>
        )}

        <div className="mb-3">
          <textarea
            value={noteInput}
            onChange={(event) => setNoteInput(event.target.value)}
            onKeyDown={handleNoteKeyDown}
            className="w-full bg-slate-900 border border-ems-gray rounded px-3 py-2 text-sm text-ems-white placeholder-ems-gray/80 focus:outline-none focus:ring-1 focus:ring-ems-blue-light"
            placeholder="Type operational note and press Enter to generate structured report"
            rows={2}
          />
        </div>

        <div className="flex-1 bg-slate-900 rounded-lg border border-ems-blue-light p-4 overflow-y-auto">
          {loadingNotes ? (
            <div className="text-center text-sm text-ems-gray py-10">
              Syncing notes...
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-ems-blue/15 p-3 rounded border-l-2 border-ems-blue-light"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-ems-gray">
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                      {note.author || "SYSTEM"}
                    </span>
                  </div>
                  <ReactMarkdown className="text-sm text-ems-white leading-relaxed">
                    {note.content || ""}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-ems-gray py-10">
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
