import { useEffect, useRef } from "react";

export default function AddressBar(props) {
  const { onAddressSelect, className } = props || {};
  const containerRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }
    if (!containerRef.current) {
      return;
    }

    const places = window.google.maps.places;
    if (!places.PlaceAutocompleteElement) {
      return;
    }

    const autocompleteElement = new places.PlaceAutocompleteElement({
      componentRestrictions: { country: ["us"] },
    });

    autocompleteElement.placeholder = "Enter dispatch address...";
    autocompleteElement.style.width = "100%";
    autocompleteElement.style.colorScheme = "dark";
    autocompleteRef.current = autocompleteElement;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(autocompleteElement);

    const handleSelect = async (event) => {
      try {
        let place = null;
        if (event.place) {
          place = event.place;
        } else if (event.placePrediction && event.placePrediction.toPlace) {
          place = event.placePrediction.toPlace();
        }
        if (!place) {
          return;
        }
        if (place.fetchFields) {
          await place.fetchFields({
            fields: ["displayName", "formattedAddress", "location"],
          });
        }
        const address = place.formattedAddress || place.displayName || "";
        const location = place.location;
        if (!location) {
          return;
        }
        const lat =
          typeof location.lat === "function" ? location.lat() : location.lat;
        const lng =
          typeof location.lng === "function" ? location.lng() : location.lng;
        if (typeof lat !== "number" || typeof lng !== "number") {
          return;
        }

        if (onAddressSelect) {
          onAddressSelect({ address, lat, lng });
        }
      } catch (error) {
        console.error("AddressBar Place Autocomplete error", error);
      }
    };

    autocompleteElement.addEventListener("gmp-placeselect", handleSelect);
    autocompleteElement.addEventListener("gmp-select", handleSelect);

    return () => {
      autocompleteElement.removeEventListener("gmp-placeselect", handleSelect);
      autocompleteElement.removeEventListener("gmp-select", handleSelect);
      autocompleteElement.remove();
      if (autocompleteRef.current === autocompleteElement) {
        autocompleteRef.current = null;
      }
    };
  }, [onAddressSelect]);

  return (
    <div className={className}>
      <div className="flex items-center gap-3 rounded-lg border border-gray-600 bg-gray-800 px-4 py-3">
        <span className="text-gray-400">🔍</span>
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
