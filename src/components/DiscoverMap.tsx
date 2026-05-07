import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, MapPinCategory } from "@/lib/types";

// Fix Leaflet's broken default icon paths in Vite/webpack builds
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CATEGORY_COLORS: Record<MapPinCategory, string> = {
  suggestion: "#6366f1",
  pool:       "#10b981",
  post:       "#f59e0b",
  meetup:     "#ef4444",
};

const CATEGORY_EMOJI: Record<MapPinCategory, string> = {
  suggestion: "✨",
  pool:       "🏊",
  post:       "📍",
  meetup:     "📌",
};

function makeIcon(category: MapPinCategory) {
  const color = CATEGORY_COLORS[category];
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26s16-16 16-26C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
    </svg>
  `);
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
  });
}

// Recenter map when city changes
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14, { animate: true });
  }, [lat, lng, map]);
  return null;
}

function copyAddress(address: string) {
  navigator.clipboard.writeText(address).then(() => alert("Address copied!"));
}

function openInGoogleMaps(pin: MapPin) {
  const q = encodeURIComponent(pin.address ?? `${pin.lat},${pin.lng}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
}

interface Props {
  pins: MapPin[];
  centerLat: number;
  centerLng: number;
  onSuggestToGroup?: (pin: MapPin) => void;
  onCreatePool?: (pin: MapPin) => void;
}

export default function DiscoverMap({ pins, centerLat, centerLng, onSuggestToGroup, onCreatePool }: Props) {
  return (
    <div className="relative w-full" style={{ height: "calc(100dvh - 180px)", minHeight: 300 }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full rounded-2xl z-0"
        style={{ background: "#e8e8e8" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={centerLat} lng={centerLng} />

        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={makeIcon(pin.category)}>
            <Popup minWidth={220} maxWidth={280} className="discover-popup">
              <div className="space-y-2 py-1">
                {/* Title + badge */}
                <div className="flex items-start gap-2">
                  <span className="text-lg leading-none">{CATEGORY_EMOJI[pin.category]}</span>
                  <div>
                    <p className="font-semibold text-sm leading-snug">{pin.title}</p>
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mt-0.5"
                      style={{
                        background: CATEGORY_COLORS[pin.category] + "22",
                        color: CATEGORY_COLORS[pin.category],
                      }}
                    >
                      {pin.category}
                    </span>
                  </div>
                </div>

                {/* Area */}
                {pin.area && (
                  <p className="text-xs text-gray-500">📍 {pin.area}{pin.address ? ` · ${pin.address}` : ""}</p>
                )}

                {/* Description */}
                {pin.description && (
                  <p className="text-xs text-gray-600 leading-snug">{pin.description}</p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    onClick={() => openInGoogleMaps(pin)}
                    className="w-full rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    Open in Google Maps ↗
                  </button>
                  {pin.address && (
                    <button
                      onClick={() => copyAddress(pin.address!)}
                      className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Copy address
                    </button>
                  )}
                  {onSuggestToGroup && (
                    <button
                      onClick={() => onSuggestToGroup(pin)}
                      className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      ✨ Suggest to group
                    </button>
                  )}
                  {onCreatePool && (
                    <button
                      onClick={() => onCreatePool(pin)}
                      className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      🏊 Create pool here
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}