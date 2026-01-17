import NoteCard from "./NoteCard.jsx";

export default function NotesPanel(props) {
  const { notes, onAddNote, onReadAloud, loading } = props || {};
  const safeNotes = Array.isArray(notes) ? notes : [];

  const handleAddNote = () => {
    if (onAddNote) {
      onAddNote();
    }
  };

  const handleReadAloud = () => {
    if (onReadAloud && safeNotes.length > 0 && !loading) {
      onReadAloud();
    }
  };

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
            disabled={loading || safeNotes.length === 0}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (loading || safeNotes.length === 0
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700")
            }
          >
            🔊 Read Aloud
          </button>
          <button
            type="button"
            onClick={handleAddNote}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
          >
            + Add Note
          </button>
        </div>
      </div>

      {safeNotes.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-700 bg-gray-900/60 px-3 py-4 text-xs text-gray-500">
          No notes for this address.
        </div>
      ) : (
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
