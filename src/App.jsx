import { useState } from "react";
import FieldUnitStatus from "./components/FieldUnitStatus.jsx";
import AddressBar from "./components/AddressBar.jsx";
import MapPanel from "./components/MapPanel.jsx";
import NotesPanel from "./components/NotesPanel.jsx";
import DashcamPanel from "./components/DashcamPanel.jsx";
import DispatchButton from "./components/DispatchButton.jsx";
import { useNotes } from "./hooks/useNotes.js";

export default function App() {
  const [location, setLocation] = useState(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const { notes } = useNotes();

  const handleAddressSelect = (nextLocation) => {
    setLocation(nextLocation);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        <header className="flex items-center gap-4">
          <div className="text-sm font-semibold tracking-widest text-gray-300">
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
            <MapPanel title="Street View">
              {location ? (
                <span className="text-gray-300">
                  Street view for {location.address}
                </span>
              ) : (
                <span className="text-gray-500">
                  Select an address to load street view.
                </span>
              )}
            </MapPanel>
            <MapPanel title="Satellite View">
              {location ? (
                <span className="text-gray-300">
                  Satellite view centered at {location.lat}, {location.lng}
                </span>
              ) : (
                <span className="text-gray-500">
                  Select an address to load satellite view.
                </span>
              )}
            </MapPanel>
            <DashcamPanel />
          </div>

          <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-4">
            <NotesPanel
              notes={notes || []}
              loading={false}
              onAddNote={() => setShowAddNote(true)}
              onReadAloud={() => {}}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
