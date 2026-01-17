import { useFieldUnit } from "../hooks/useFieldUnit.js";

export default function FieldUnitStatus() {
  const { connected, status } = useFieldUnit();

  const voiceReady = status ? status.voice_ready : false;
  const displayReady = status ? status.display_ready : false;

  return (
    <div className="flex items-center gap-3">
      <div
        className={
          "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border " +
          (connected
            ? "bg-green-900/30 text-green-400 border-green-700"
            : "bg-red-900/30 text-red-400 border-red-700 animate-pulse")
        }
      >
        <span className={connected ? "text-green-500" : "text-red-500"}>●</span>
        <span>{connected ? "Field Unit Online" : "Field Unit Offline"}</span>
      </div>
      {connected && status && (
        <div className="flex items-center gap-3 text-xs text-gray-300">
          <div className="flex items-center gap-1">
            <span className={voiceReady ? "text-green-500" : "text-red-500"}>
              ●
            </span>
            <span>Voice</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={displayReady ? "text-green-500" : "text-red-500"}>
              ●
            </span>
            <span>Display</span>
          </div>
        </div>
      )}
    </div>
  );
}
