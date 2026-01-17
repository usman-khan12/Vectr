import { useState } from "react";

const TYPES = ["hazard", "access", "parking", "animal", "general"];

export default function AddNoteModal(props) {
  const { address, onClose, onSave } = props || {};
  const [type, setType] = useState("general");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content || saving) {
      return;
    }
    if (!onSave) {
      return;
    }
    setSaving(true);
    try {
      await onSave(type, content);
    } finally {
      setSaving(false);
    }
  };

  const disabled = !content || saving;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-gray-800 p-6 shadow-xl">
        <div className="mb-4 text-sm font-semibold text-gray-200">
          Add Note for {address}
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {TYPES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={
                "min-h-[44px] rounded-lg border px-3 py-2 capitalize transition-colors duration-150 " +
                (type === value
                  ? "border-blue-500 bg-blue-900/40 text-blue-200"
                  : "border-gray-600 bg-gray-900/40 text-gray-300 hover:border-gray-400")
              }
            >
              {value}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            placeholder="Enter note details..."
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-xs font-medium text-gray-200 transition-colors duration-150 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            className={
              "min-h-[44px] rounded-md px-4 py-2 text-xs font-medium transition-colors duration-150 " +
              (disabled
                ? "cursor-not-allowed bg-gray-700 text-gray-500"
                : "bg-green-600 text-white hover:bg-green-700")
            }
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
