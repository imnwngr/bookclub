import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
export function LocationPicker({
  onPick,
  initial,
}: {
  onPick: (v: {
    latitude: number;
    longitude: number;
    venue_name?: string;
    address?: string;
    place_id?: string;
  }) => void;
  initial?: { latitude: number | null; longitude: number | null };
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLDivElement>(null);
  const callback = useRef(onPick);
  callback.current = onPick;
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const initialPosition = useRef(initial);
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let listener: google.maps.MapsEventListener | undefined;
    let marker:
      google.maps.Marker | google.maps.marker.AdvancedMarkerElement | undefined;
    setOptions({ key, v: "quarterly", language: "vi", region: "VN" });
    void Promise.all([
      importLibrary("maps"),
      importLibrary("places"),
      importLibrary("marker"),
    ])
      .then(() => {
        if (cancelled || !canvas.current || !search.current) return;
        const coords = initialPosition.current;
        const position =
          coords?.latitude != null && coords.longitude != null
            ? { lat: coords.latitude, lng: coords.longitude }
            : undefined;
        const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
        const map = new google.maps.Map(canvas.current, {
          center: position ?? { lat: 10.0452, lng: 105.7469 },
          zoom: 14,
          ...(mapId ? { mapId } : {}),
        });
        marker = mapId
          ? new google.maps.marker.AdvancedMarkerElement({ map, position })
          : new google.maps.Marker({ map, position });
        const moveMarker = (point: google.maps.LatLngLiteral) => {
          if (marker instanceof google.maps.Marker) marker.setPosition(point);
          else marker!.position = point;
        };
        const autocomplete = new google.maps.places.PlaceAutocompleteElement({
          includedRegionCodes: ["vn"],
        });
        autocomplete.setAttribute("aria-label", "Tìm địa điểm Google Maps");
        search.current.replaceChildren(autocomplete);
        autocomplete.addEventListener("gmp-select", async (event: Event) => {
          try {
            const e = event as Event & {
              placePrediction: { toPlace: () => google.maps.places.Place };
            };
            const place = e.placePrediction.toPlace();
            await place.fetchFields({
              fields: ["displayName", "formattedAddress", "location", "id"],
            });
            if (cancelled || !place.location) return;
            const pos = {
              lat: place.location.lat(),
              lng: place.location.lng(),
            };
            map.panTo(pos);
            moveMarker(pos);
            callback.current({
              latitude: pos.lat,
              longitude: pos.lng,
              venue_name: place.displayName ?? "",
              address: place.formattedAddress ?? "",
              place_id: place.id,
            });
          } catch {
            setError(
              "Không tìm được địa điểm. Bạn vẫn có thể nhập vị trí thủ công.",
            );
          }
        });
        listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            moveMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            callback.current({
              latitude: e.latLng.lat(),
              longitude: e.latLng.lng(),
              place_id: "",
            });
          }
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Không tải được Google Maps. Kiểm tra key, API và quota hoặc nhập thủ công.",
          );
      });
    return () => {
      cancelled = true;
      listener?.remove();
      if (marker instanceof google.maps.Marker) marker.setMap(null);
      else if (marker) marker.map = null;
    };
  }, [key]);
  if (!key)
    return (
      <p className="notice">
        Chưa bật Google Maps. Bạn có thể nhập địa chỉ, tọa độ hoặc liên kết bản
        đồ bên dưới.
      </p>
    );
  return (
    <div>
      <div ref={search} />
      {!ready && !error && <p role="status">Đang tải bản đồ…</p>}
      {error && <p role="alert">{error}</p>}
      <div
        className="map-canvas"
        ref={canvas}
        aria-label="Bản đồ chọn địa điểm"
      />
      <p className="footnote">
        Tìm kiếm hoặc nhấp bản đồ để chọn vị trí. Có thể nhập tọa độ bằng bàn
        phím.
      </p>
    </div>
  );
}
