import { useEffect, useRef, useState } from "react";

export default function AddressBar(props) {
  const { onAddressSelect, className } = props || {};
  const inputRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }
    if (!inputRef.current) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["address"],
        componentRestrictions: { country: "us" },
      },
    );

    setReady(true);

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place || !place.geometry || !place.geometry.location) {
        return;
      }
      const address = place.formatted_address || place.name || "";
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      if (onAddressSelect) {
        onAddressSelect({ address, lat, lng });
      }
    });

    return () => {
      if (listener && listener.remove) {
        listener.remove();
      }
    };
  }, [onAddressSelect]);

  const disabled = !ready;

  return (
    <div className={className}>
      <div className="flex items-center gap-3 rounded-lg border border-gray-600 bg-gray-800 px-4 py-3">
        <span className="text-gray-400">🔍</span>
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={
            disabled ? "Loading maps..." : "Enter dispatch address..."
          }
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500 focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}
