import { useState } from "react";
import FieldUnitStatus from "./components/FieldUnitStatus.jsx";
import AddressBar from "./components/AddressBar.jsx";
import MapPanel from "./components/MapPanel.jsx";
import NotesPanel from "./components/NotesPanel.jsx";
import DashcamPanel from "./components/DashcamPanel.jsx";
import DispatchButton from "./components/DispatchButton.jsx";
import AddNoteModal from "./components/AddNoteModal.jsx";
import { useNotes } from "./hooks/useNotes.js";

export default function App() {
  const [location, setLocation] = useState(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const {
    notes,
    loading: notesLoading,
    error: notesError,
    addNote,
  } = useNotes(location ? location.address : null);

  const handleAddressSelect = (nextLocation) => {
    setLocation(nextLocation);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        <header className="flex items-center gap-4">
          <div className="text-2xl font-bold tracking-widest text-blue-400">
            VECTR
          </div>
          <div className="flex-1">
            <AddressBar
              onAddressSelect={handleAddressSelect}
              className="w-full"
            />
          </div>
          <FieldUnitStatus />
          <div className="w-56">
            <DispatchButton
              address={location ? location.address : undefined}
              lat={location ? location.lat : undefined}
              lng={location ? location.lng : undefined}
              notes={notes}
              disabled={!location}
            />
          </div>
        </header>

        <main className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="h-64 lg:h-72">
              <MapPanel
                lat={location ? location.lat : null}
                lng={location ? location.lng : null}
                mode="street"
                className="h-full w-full"
              />
            </div>
            <div className="h-64 lg:h-72">
              <MapPanel
                lat={location ? location.lat : null}
                lng={location ? location.lng : null}
                mode="satellite"
                className="h-full w-full"
              />
            </div>
            <DashcamPanel />
          </div>

          <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
            <NotesPanel
              address={location ? location.address : ""}
              notes={notes || []}
              loading={notesLoading}
              error={notesError}
              onAddNote={() => setShowAddNote(true)}
            />
          </section>
        </main>

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
      </div>
    </div>
  );
}
