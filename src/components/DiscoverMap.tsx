import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FriendGroup, MapPin, MapPinCategory, PlaceCategory, DiscoverPlace } from "@/lib/types";
import { addCustomPlace, placeToMapPin } from "@/lib/places";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export const PLACE_CATEGORY_CONFIG: Record<PlaceCategory, { color: string; emoji: string; label: string }> = {
  cafe:         { color: "#f59e0b", emoji: "☕", label: "Café" },
  bar:          { color: "#8b5cf6", emoji: "🍻", label: "Bar" },
  restaurant:   { color: "#ef4444", emoji: "🍽️", label: "Restaurant" },
  library:      { color: "#3b82f6", emoji: "📚", label: "Library" },
  park:         { color: "#10b981", emoji: "🌳", label: "Park" },
  museum:       { color: "#ec4899", emoji: "🏛️", label: "Museum" },
  viewpoint:    { color: "#06b6d4", emoji: "🔭", label: "Viewpoint" },
  study_spot:   { color: "#6366f1", emoji: "💻", label: "Study Spot" },
  event_venue:  { color: "#f97316", emoji: "🎉", label: "Events" },
  public_space: { color: "#84cc16", emoji: "🏞️", label: "Public Space" },
  sports:       { color: "#0ea5e9", emoji: "⚽", label: "Sports" },
  other:        { color: "#94a3b8", emoji: "📍", label: "Other" },
};

const PIN_CATEGORY_COLORS: Record<MapPinCategory, string> = {
  place: "#6366f1", suggestion: "#6366f1",
  pool: "#10b981", post: "#f59e0b", meetup: "#ef4444",
};

function getPinColor(pin: MapPin, favoriteIds: string[]): string {
  if (favoriteIds.includes(pin.placeId ?? pin.id)) return "#f43f5e";
  if (pin.source === "manual") return "#1d4ed8";
  if (pin.placeCategory) return PLACE_CATEGORY_CONFIG[pin.placeCategory].color;
  return PIN_CATEGORY_COLORS[pin.category];
}
function getPinEmoji(pin: MapPin) {
  return pin.placeCategory ? PLACE_CATEGORY_CONFIG[pin.placeCategory].emoji : "📍";
}
function getPinLabel(pin: MapPin) {
  return pin.placeCategory ? PLACE_CATEGORY_CONFIG[pin.placeCategory].label : pin.category;
}

function makeIcon(color: string, special = false) {
  const svg = encodeURIComponent(
    special
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 46" width="36" height="46"><path d="M18 0C8.059 0 0 8.059 0 18c0 11.25 18 28 18 28s18-16.75 18-28C36 8.059 27.941 0 18 0z" fill="${color}" stroke="white" stroke-width="2.5"/><circle cx="18" cy="18" r="9" fill="white" opacity="0.9"/><text x="18" y="22" text-anchor="middle" font-size="10" fill="${color}">★</text></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26s16-16 16-26C32 7.163 24.837 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/></svg>`
  );
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: special ? [36, 46] : [28, 37],
    iconAnchor: special ? [18, 46] : [14, 37],
    popupAnchor: [0, -40],
  });
}

// Fixes tile rendering when container was hidden (display:none) then shown
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function InitialCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!done.current) {
      map.setView([lat, lng], 13, { animate: false });
      done.current = true;
    }
  }, [lat, lng, map]);
  return null;
}

function PlacementHandler({ active, onPlace }: { active: boolean; onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => { if (active) onPlace(e.latlng.lat, e.latlng.lng); } });
  useEffect(() => {
    const el = document.querySelector(".leaflet-container") as HTMLElement | null;
    if (el) el.style.cursor = active ? "crosshair" : "";
  }, [active]);
  return null;
}

const ADD_CATEGORIES: PlaceCategory[] = [
  "cafe", "bar", "restaurant", "park", "sports",
  "viewpoint", "library", "study_spot", "event_venue", "public_space", "other",
];

interface Props {
  pins: MapPin[];
  centerLat: number;
  centerLng: number;
  loading?: boolean;
  favoriteIds?: string[];
  groups?: FriendGroup[];
  onSuggest?: (groupId: string, pin: MapPin) => void;
  onPinAdded?: (pin: MapPin) => void;
  onViewDetails?: (pin: MapPin) => void;
  onRefresh?: () => void;
}

export default function DiscoverMap({
  pins, centerLat, centerLng, loading, favoriteIds = [],
  groups = [], onSuggest, onPinAdded, onViewDetails, onRefresh,
}: Props) {
  const [activeCategories, setActiveCategories] = useState<Set<PlaceCategory>>(new Set());
  const [myPlacesOnly, setMyPlacesOnly] = useState(false);
  const [placingMode, setPlacingMode] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<PlaceCategory>("cafe");
  const [addDesc, setAddDesc] = useState("");
  const [addAddress, setAddAddress] = useState("");
  // Per-pin group selection state inside popups
  const [suggestPin, setSuggestPin] = useState<MapPin | null>(null);
  const [suggestGroupId, setSuggestGroupId] = useState(groups[0]?.id ?? "");

  useEffect(() => {
    if (groups.length > 0 && !suggestGroupId) setSuggestGroupId(groups[0].id);
  }, [groups]);

  const availableCategories = Array.from(
    new Set(pins.map((p) => p.placeCategory ?? "other")),
  ).filter((c): c is PlaceCategory => c in PLACE_CATEGORY_CONFIG)
   .sort((a, b) => PLACE_CATEGORY_CONFIG[a].label.localeCompare(PLACE_CATEGORY_CONFIG[b].label));

  const toggleCategory = (cat: PlaceCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  let visiblePins = activeCategories.size === 0 ? pins
    : pins.filter((p) => p.placeCategory && activeCategories.has(p.placeCategory));
  if (myPlacesOnly) {
    visiblePins = visiblePins.filter(
      (p) => p.source === "manual" || favoriteIds.includes(p.placeId ?? p.id),
    );
  }

  const myCount = pins.filter(
    (p) => p.source === "manual" || favoriteIds.includes(p.placeId ?? p.id),
  ).length;

  const handlePlace = (lat: number, lng: number) => { setPendingLatLng({ lat, lng }); setPlacingMode(false); };
  const cancelAdd = () => { setPendingLatLng(null); setPlacingMode(false); };

  const handleAddSubmit = () => {
    if (!pendingLatLng || !addName.trim()) return;
    const place = addCustomPlace({
      name: addName.trim(), category: addCategory,
      description: addDesc.trim() || undefined,
      address: addAddress.trim() || undefined,
      area: undefined, city: "Zurich",
      lat: pendingLatLng.lat, lng: pendingLatLng.lng,
    });
    onPinAdded?.(placeToMapPin(place));
    setPendingLatLng(null);
    setAddName(""); setAddDesc(""); setAddAddress(""); setAddCategory("cafe");
  };

  const handleSuggestConfirm = () => {
    if (!suggestPin || !suggestGroupId) return;
    onSuggest?.(suggestGroupId, suggestPin);
    setSuggestPin(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setMyPlacesOnly((v) => !v)}
          className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            myPlacesOnly ? "border-rose-500 bg-rose-500 text-white" : "border-border bg-card text-muted-foreground"
          }`}
        >
          ❤️ My places {myCount > 0 && `(${myCount})`}
        </button>
        {availableCategories.map((cat) => {
          const cfg = PLACE_CATEGORY_CONFIG[cat];
          const active = activeCategories.has(cat);
          return (
            <button key={cat} onClick={() => toggleCategory(cat)}
              style={active ? { background: cfg.color, borderColor: cfg.color } : {}}
              className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "text-white" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {cfg.emoji} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading…" : <><span className="font-medium text-foreground">{visiblePins.length}</span> places</>}
        </p>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button onClick={onRefresh} disabled={loading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          )}
          {!placingMode && !pendingLatLng && (
            <button onClick={() => setPlacingMode(true)} className="text-xs font-medium text-primary">+ Add place</button>
          )}
          {placingMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-medium animate-pulse">Tap map to place pin</span>
              <button onClick={cancelAdd} className="text-xs text-muted-foreground">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Add place form */}
      {pendingLatLng && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-900">Add a new place</p>
          <p className="text-xs text-blue-600">📍 {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}</p>
          <Input placeholder="Name *" value={addName} onChange={(e) => setAddName(e.target.value)} />
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={addCategory} onChange={(e) => setAddCategory(e.target.value as PlaceCategory)}>
            {ADD_CATEGORIES.map((c) => (
              <option key={c} value={c}>{PLACE_CATEGORY_CONFIG[c].emoji} {PLACE_CATEGORY_CONFIG[c].label}</option>
            ))}
          </select>
          <Input placeholder="Description (optional)" value={addDesc} onChange={(e) => setAddDesc(e.target.value)} />
          <Input placeholder="Address (optional)" value={addAddress} onChange={(e) => setAddAddress(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleAddSubmit} disabled={!addName.trim()}>Save place</Button>
            <Button size="sm" variant="outline" onClick={cancelAdd}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Suggest-to-group sheet (shown below map when active) */}
      {suggestPin && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-semibold">Suggest <span className="text-primary">"{suggestPin.title}"</span> to:</p>
          <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={suggestGroupId} onChange={(e) => setSuggestGroupId(e.target.value)}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}
          </select>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleSuggestConfirm}>
              ✨ Send suggestion
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSuggestPin(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="relative w-full" style={{ height: "calc(100dvh - 260px)", minHeight: 280 }}>
        <MapContainer center={[centerLat, centerLng]} zoom={13} scrollWheelZoom
          className="h-full w-full rounded-2xl z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd" maxZoom={20}
          />
          <InitialCenter lat={centerLat} lng={centerLng} />
          <AutoResize />
          <PlacementHandler active={placingMode} onPlace={handlePlace} />

          {pendingLatLng && (
            <Marker position={[pendingLatLng.lat, pendingLatLng.lng]} icon={makeIcon("#1d4ed8")} />
          )}

          {visiblePins.map((pin) => {
            const isFav = favoriteIds.includes(pin.placeId ?? pin.id);
            const isOwn = pin.source === "manual";
            const color = getPinColor(pin, favoriteIds);
            return (
              <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={makeIcon(color, isFav || isOwn)}>
                <Popup minWidth={240} maxWidth={300}>
                  <div className="space-y-2.5 py-1 font-sans">
                    <div className="flex items-start gap-2">
                      <span className="text-xl leading-none mt-0.5">{getPinEmoji(pin)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 leading-snug">{pin.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: color + "22", color }}>
                            {getPinLabel(pin)}
                          </span>
                          {isFav && <span className="text-[10px] text-rose-500 font-semibold">❤️ Saved</span>}
                          {isOwn && <span className="text-[10px] text-blue-600 font-semibold">📌 Your place</span>}
                        </div>
                      </div>
                    </div>

                    {(pin.area || pin.address) && (
                      <p className="text-xs text-gray-500">📍 {[pin.area, pin.address].filter(Boolean).join(" · ")}</p>
                    )}
                    {pin.description
                      ? <p className="text-xs text-gray-600 leading-snug">{pin.description}</p>
                      : <p className="text-xs text-gray-400 italic">No description yet.</p>}

                    <div className="border-t border-gray-100" />
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.address ?? `${pin.lat},${pin.lng}`)}`, "_blank")}
                        className="w-full rounded-lg py-2 text-xs font-semibold text-white"
                        style={{ background: color }}
                      >
                        Open in Google Maps ↗
                      </button>
                      {onViewDetails && (
                        <button onClick={() => onViewDetails(pin)}
                          className="w-full rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          View details & reviews
                        </button>
                      )}
                      {groups.length > 0 && (
                        <button
                          onClick={() => { setSuggestPin(pin); setSuggestGroupId(groups[0].id); }}
                          className="w-full rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                          ✨ Suggest to group
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}