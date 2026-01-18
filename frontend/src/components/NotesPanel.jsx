import { useState } from "react";
import NoteCard from "./NoteCard.jsx";
import { formatNotesForSpeech, speakText } from "../services/elevenlabs.js";

export default function NotesPanel(props) {
  const { address, notes, onAddNote, loading, error } = props || {};
  const safeNotes = Array.isArray(notes) ? notes : [];
  const [speaking, setSpeaking] = useState(false);

  const handleAddNote = () => {
    if (onAddNote) {
      onAddNote();
    }
  };

  const handleReadAloud = async () => {
    if (loading || speaking || safeNotes.length === 0) {
      return;
    }
    setSpeaking(true);
    try {
      const text = formatNotesForSpeech(address, safeNotes);
      await speakText(text);
    } catch (err) {
      console.error("NotesPanel read aloud error", err);
    } finally {
      setSpeaking(false);
    }
  };

  const disableReadAloud =
    loading || speaking || safeNotes.length === 0 || !!error;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-200">
          Call Notes ({safeNotes.length})
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReadAloud}
            disabled={disableReadAloud}
            className={
              "min-h-[44px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 " +
              (disableReadAloud
                ? "cursor-not-allowed bg-gray-700 text-gray-500"
                : "bg-blue-600 text-white hover:bg-blue-700")
            }
          >
            {speaking ? "🔊 Speaking..." : "🔊 Read Aloud"}
          </button>
          <button
            type="button"
            onClick={handleAddNote}
            className="min-h-[44px] rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-green-700"
          >
            + Add Note
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-md border border-dashed border-gray-700 bg-gray-900/60 px-3 py-4 text-xs text-gray-500">
          Loading notes...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-dashed border-red-700 bg-red-900/40 px-3 py-4 text-xs text-red-300">
          Failed to load notes.
        </div>
      )}

      {!loading && !error && safeNotes.length === 0 && (
        <div className="rounded-md border border-dashed border-gray-700 bg-gray-900/60 px-3 py-4 text-xs text-gray-500">
          No notes for this address.
        </div>
      )}

      {!loading && !error && safeNotes.length > 0 && (
        <div className="flex max-h-32 flex-col gap-2 overflow-y-auto">
          {safeNotes.map((note) => (
            <NoteCard
              key={note.id || `${note.type}-${note.content}`}
              type={note.type}
              content={note.content}
            />
          ))}
        </div>
      )}
    </div>
  );
}
