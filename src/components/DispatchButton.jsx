import { useState } from "react";
import { useFieldUnit } from "../hooks/useFieldUnit.js";

export default function DispatchButton(props) {
  const { address, lat, lng, notes, disabled } = props || {};
  const { connected, dispatch } = useFieldUnit();
  const [justDispatched, setJustDispatched] = useState(false);

  const isDisabled = Boolean(disabled || !connected || !address);

  const handleClick = () => {
    if (isDisabled) {
      return;
    }
    dispatch(address, lat, lng, Array.isArray(notes) ? notes : []);
    setJustDispatched(true);
    setTimeout(() => {
      setJustDispatched(false);
    }, 1000);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={
          "w-full rounded-md px-4 py-4 text-center text-sm font-medium transition-colors duration-150 min-h-[44px] " +
          (isDisabled
            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700")
        }
      >
        {justDispatched ? "Dispatched!" : "📡 Dispatch to Field Unit"}
      </button>
      {!connected && (
        <p className="mt-1 text-xs text-red-400">Field unit offline</p>
      )}
    </div>
  );
}
