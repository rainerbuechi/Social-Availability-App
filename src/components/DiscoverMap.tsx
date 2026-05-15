import { useCallback, useEffect, useRef, useState } from "react";
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

export const PLACE_CATEGORY_CONFIG: Record<
  PlaceCategory,
  { color: string; emoji: string; label: string }
> = {
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

/* ── Marker icon variants ──────────────────────────
 *
 *  "osm"         — standard teardrop, category color
 *  "community"   — larger teardrop with ★ + person ring, community violet
 *  "favorite"    — teardrop with ❤ inside, rose
 *  "private"     — small teardrop with lock dots, muted gray
 *  "pending"     — placement preview, blue
 */
type MarkerVariant = "osm" | "community" | "favorite" | "private" | "pending";

function makeIcon(color: string, variant: MarkerVariant = "osm"): L.Icon {
  let svgInner = "";
  let w = 28, h = 37, ax = 14, ay = 37;

  switch (variant) {
    case "community":
      // Larger pin with a star cutout — community places
      w = 36; h = 46; ax = 18; ay = 46;
      svgInner = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 46" width="${w}" height="${h}">
          <path d="M18 0C8.059 0 0 8.059 0 18c0 11.25 18 28 18 28s18-16.75 18-28C36 8.059 27.941 0 18 0z"
            fill="${color}" stroke="white" stroke-width="2.5"/>
          <circle cx="18" cy="18" r="9.5" fill="white" opacity="0.95"/>
          <text x="18" y="22.5" text-anchor="middle" font-size="11" fill="${color}" font-weight="bold">★</text>
        </svg>`;
      break;

    case "favorite":
      // Rose pin with heart
      w = 34; h = 44; ax = 17; ay = 44;
      svgInner = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 44" width="${w}" height="${h}">
          <path d="M17 0C7.611 0 0 7.611 0 17c0 10.625 17 27 17 27s17-16.375 17-27C34 7.611 26.389 0 17 0z"
            fill="${color}" stroke="white" stroke-width="2.5"/>
          <circle cx="17" cy="17" r="8.5" fill="white" opacity="0.95"/>
          <text x="17" y="21.5" text-anchor="middle" font-size="11" fill="${color}">♥</text>
        </svg>`;
      break;

    case "private":
      // Smaller, more muted pin for private places
      w = 24; h = 32; ax = 12; ay = 32;
      svgInner = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="${w}" height="${h}">
          <path d="M12 0C5.372 0 0 5.372 0 12c0 7.5 12 20 12 20s12-12.5 12-20C24 5.372 18.628 0 12 0z"
            fill="${color}" stroke="white" stroke-width="1.5" opacity="0.7"/>
          <circle cx="12" cy="12" r="5.5" fill="white" opacity="0.8"/>
          <text x="12" y="15.5" text-anchor="middle" font-size="7" fill="${color}" opacity="0.9">🔒</text>
        </svg>`;
      break;

    case "pending":
      w = 32; h = 42; ax = 16; ay = 42;
      svgInner = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="${w}" height="${h}">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26s16-16 16-26C32 7.163 24.837 0 16 0z"
            fill="${color}" stroke="white" stroke-width="2.5" stroke-dasharray="4 2"/>
          <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
          <text x="16" y="20" text-anchor="middle" font-size="9" fill="${color}">+</text>
        </svg>`;
      break;

    default: // "osm" — standard teardrop
      svgInner = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="${w}" height="${h}">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26s16-16 16-26C32 7.163 24.837 0 16 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/>
        </svg>`;
      break;
  }

  const svg = encodeURIComponent(svgInner.trim());
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [w, h],
    iconAnchor: [ax, ay],
    popupAnchor: [0, -(ay - 4)],
  });
}

function getPinVariant(
  pin: MapPin,
  favoriteIds: string[],
  currentUserId?: string,
): { color: string; variant: MarkerVariant } {
  const isFav = favoriteIds.includes(pin.placeId ?? pin.id);
  if (isFav) return { color: "#f43f5e", variant: "favorite" };

  if (pin.source === "manual") {
    // Community-added public place
    // We don't have isPublic on MapPin directly, but source="manual" + non-private tells us enough.
    // We'll distinguish by whether the user owns it vs it's a public community place.
    // For now: all manual places get "community" style when on the map.
    return { color: "#7c3aed", variant: "community" };
  }

  // Standard OSM / external place
  const catColor = pin.placeCategory
    ? PLACE_CATEGORY_CONFIG[pin.placeCategory].color
    : PIN_CATEGORY_COLORS[pin.category];
  return { color: catColor, variant: "osm" };
}

function getPinEmoji(pin: MapPin) {
  return pin.placeCategory ? PLACE_CATEGORY_CONFIG[pin.placeCategory].emoji : "📍";
}
function getPinLabel(pin: MapPin) {
  return pin.placeCategory ? PLACE_CATEGORY_CONFIG[pin.placeCategory].label : pin.category;
}

/* ── Map utility components ──────────────────────── */

function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/**
 * Watches for centerLat/centerLng changes and flies the map to the new position.
 * First render: instant setView; subsequent changes: smooth flyTo.
 */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    const prev = prevRef.current;
    if (!prev) {
      map.setView([lat, lng], 13, { animate: false });
    } else if (Math.abs(prev.lat - lat) > 0.001 || Math.abs(prev.lng - lng) > 0.001) {
      map.flyTo([lat, lng], 13, { duration: 1.2 });
    }
    prevRef.current = { lat, lng };
  }, [lat, lng, map]);
  return null;
}

function PlacementHandler({
  active,
  onPlace,
}: {
  active: boolean;
  onPlace: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => { if (active) onPlace(e.latlng.lat, e.latlng.lng); },
  });
  useEffect(() => {
    const el = document.querySelector(".leaflet-container") as HTMLElement | null;
    if (el) el.style.cursor = active ? "crosshair" : "";
  }, [active]);
  return null;
}

/**
 * Fires onBoundsChange when the user stops moving the map (debounced internally by parent).
 */
function BoundsTracker({
  onBoundsChange,
}: {
  onBoundsChange?: (bbox: [number, number, number, number], center: { lat: number; lng: number }) => void;
}) {
  const map = useMap();
  useMapEvents({
    moveend: () => {
      if (!onBoundsChange) return;
      const b = map.getBounds();
      const c = map.getCenter();
      onBoundsChange(
        [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()],
        { lat: c.lat, lng: c.lng },
      );
    },
  });
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
  currentUserId?: string;
  onSuggest?: (groupId: string, pin: MapPin) => void;
  onPinAdded?: (pin: MapPin) => void;
  onViewDetails?: (pin: MapPin) => void;
  onRefresh?: () => void;
  onBoundsChange?: (bbox: [number, number, number, number], center: { lat: number; lng: number }) => void;
}

export default function DiscoverMap({
  pins, centerLat, centerLng, loading, favoriteIds = [],
  groups = [], currentUserId, onSuggest, onPinAdded, onViewDetails, onRefresh, onBoundsChange,
}: Props) {
  const [activeCategories, setActiveCategories] = useState<Set<PlaceCategory>>(new Set());
  const [myPlacesOnly, setMyPlacesOnly] = useState(false);
  const [communityOnly, setCommunityOnly] = useState(false);
  const [placingMode, setPlacingMode] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<PlaceCategory>("cafe");
  const [addDesc, setAddDesc] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addIsPublic, setAddIsPublic] = useState(false);

  const [suggestPin, setSuggestPin] = useState<MapPin | null>(null);
  const [suggestGroupId, setSuggestGroupId] = useState(groups[0]?.id ?? "");

  useEffect(() => {
    if (groups.length > 0 && !suggestGroupId) setSuggestGroupId(groups[0].id);
  }, [groups]);

  const CATEGORY_ORDER: PlaceCategory[] = [
    "cafe", "sports", "bar", "park", "library", "restaurant",
    "study_spot", "public_space", "viewpoint",
    "museum", "event_venue", "other",
  ];
  const availableCategories = CATEGORY_ORDER.filter((c) =>
    pins.some((p) => p.placeCategory === c),
  );

  const toggleCategory = (cat: PlaceCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  let visiblePins =
    activeCategories.size === 0
      ? pins
      : pins.filter((p) => p.placeCategory && activeCategories.has(p.placeCategory));
  if (myPlacesOnly) {
    visiblePins = visiblePins.filter(
      (p) => p.source === "manual" || favoriteIds.includes(p.placeId ?? p.id),
    );
  }
  if (communityOnly) {
    visiblePins = visiblePins.filter((p) => p.source === "manual");
  }

  const myCount = pins.filter(
    (p) => p.source === "manual" || favoriteIds.includes(p.placeId ?? p.id),
  ).length;

  const communityCount = pins.filter((p) => p.source === "manual").length;

  const handlePlace = (lat: number, lng: number) => {
    setPendingLatLng({ lat, lng });
    setPlacingMode(false);
  };

  const handleAddSubmit = () => {
    if (!pendingLatLng || !addName.trim()) return;
    const place = addCustomPlace({
      name: addName.trim(),
      category: addCategory,
      description: addDesc.trim() || undefined,
      address: addAddress.trim() || undefined,
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      city: "Zurich",
      area: undefined,
      isPublic: addIsPublic,
      addedByUserId: currentUserId,
    });
    const pin = placeToMapPin(place);
    onPinAdded?.(pin);
    cancelAdd();
  };

  const cancelAdd = () => {
    setPlacingMode(false);
    setPendingLatLng(null);
    setAddName("");
    setAddDesc("");
    setAddAddress("");
    setAddIsPublic(false);
  };

  const handleSuggestConfirm = () => {
    if (!suggestPin || !suggestGroupId) return;
    onSuggest?.(suggestGroupId, suggestPin);
    setSuggestPin(null);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar — row 1: actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {myCount > 0 && (
            <button
              onClick={() => setMyPlacesOnly((v) => !v)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                myPlacesOnly
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              ⭐ Mine ({myCount})
            </button>
          )}
          {communityCount > 0 && (
            <button
              onClick={() => setCommunityOnly((v) => !v)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                communityOnly
                  ? "bg-violet-600 text-white border-violet-600"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              👥 Community ({communityCount})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            onClick={() => { setPlacingMode(true); setPendingLatLng(null); }}
            className="rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-xs font-medium"
          >
            + Add place
          </button>
        </div>
      </div>

      {/* Toolbar — row 2: category chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
              activeCategories.has(cat)
                ? "border-transparent text-white"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            style={activeCategories.has(cat) ? { background: PLACE_CATEGORY_CONFIG[cat].color } : {}}
          >
            {PLACE_CATEGORY_CONFIG[cat].emoji} {PLACE_CATEGORY_CONFIG[cat].label}
          </button>
        ))}
      </div>


      {/* Placement instructions */}
      {placingMode && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary font-medium">
          Tap anywhere on the map to drop a pin
          <button className="ml-2 underline text-muted-foreground" onClick={cancelAdd}>
            Cancel
          </button>
        </div>
      )}

      {/* Add place form */}
      {pendingLatLng && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Add a new place</p>
          <Input
            placeholder="Place name *"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
          />
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={addCategory}
            onChange={(e) => setAddCategory(e.target.value as PlaceCategory)}
          >
            {ADD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {PLACE_CATEGORY_CONFIG[c].emoji} {PLACE_CATEGORY_CONFIG[c].label}
              </option>
            ))}
          </select>
          <Input
            placeholder="Description (optional)"
            value={addDesc}
            onChange={(e) => setAddDesc(e.target.value)}
          />
          <Input
            placeholder="Address (optional)"
            value={addAddress}
            onChange={(e) => setAddAddress(e.target.value)}
          />

          {/* Public / Private toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">
                {addIsPublic ? "👥 Public — visible to everyone" : "🔒 Private — only you"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {addIsPublic
                  ? "Appears on Discover and the community map"
                  : "Only you can see this — great for personal favourites & meetup spots"}
              </p>
            </div>
            <button
              onClick={() => setAddIsPublic((v) => !v)}
              className={`ml-3 shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                addIsPublic ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  addIsPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={handleAddSubmit}
              disabled={!addName.trim()}
            >
              {addIsPublic ? "✨ Save & share" : "💾 Save privately"}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelAdd}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Suggest-to-group sheet */}
      {suggestPin && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-semibold">
            Suggest <span className="text-primary">"{suggestPin.title}"</span> to:
          </p>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={suggestGroupId}
            onChange={(e) => setSuggestGroupId(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.emoji} {g.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleSuggestConfirm}>
              ✨ Send suggestion
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSuggestPin(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Map */}
      <div
        className="relative w-full"
        style={{ height: "calc(100dvh - 280px)", minHeight: 300 }}
      >
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={13}
          scrollWheelZoom
          className="h-full w-full rounded-2xl z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <RecenterMap lat={centerLat} lng={centerLng} />
          <AutoResize />
          <PlacementHandler active={placingMode} onPlace={handlePlace} />
          <BoundsTracker onBoundsChange={onBoundsChange} />

          {pendingLatLng && (
            <Marker
              position={[pendingLatLng.lat, pendingLatLng.lng]}
              icon={makeIcon("#1d4ed8", "pending")}
            />
          )}

          {visiblePins.map((pin) => {
            const { color, variant } = getPinVariant(pin, favoriteIds, currentUserId);
            const isFav = favoriteIds.includes(pin.placeId ?? pin.id);
            const isOwn = pin.source === "manual";

            return (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={makeIcon(color, variant)}
              >
                <Popup minWidth={240} maxWidth={300}>
                  <div className="space-y-2.5 py-1 font-sans">
                    <div className="flex items-start gap-2">
                      <span className="text-xl leading-none mt-0.5">{getPinEmoji(pin)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 leading-snug">
                          {pin.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: color + "22", color }}
                          >
                            {getPinLabel(pin)}
                          </span>
                          {isFav && (
                            <span className="text-[10px] text-rose-500 font-semibold">❤️ Saved</span>
                          )}
                          {isOwn && (
                            <span className="text-[10px] text-violet-600 font-semibold">
                              👥 Community
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {(pin.area || pin.address) && (
                      <p className="text-xs text-gray-500">
                        📍 {[pin.area, pin.address].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {pin.description ? (
                      <p className="text-xs text-gray-600 leading-snug">{pin.description}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No description yet.</p>
                    )}

                    <div className="border-t border-gray-100" />
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              pin.address ?? pin.title,
                            )}`,
                            "_blank",
                          )
                        }
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        🗺️ Open in Google Maps
                      </button>
                      <button
                        onClick={() => onViewDetails?.(pin)}
                        className="w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        View details
                      </button>
                      {groups.length > 0 && (
                        <button
                          onClick={() => { setSuggestPin(pin); setSuggestGroupId(groups[0].id); }}
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
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

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 rounded-2xl bg-background/60 flex items-center justify-center z-10 pointer-events-none">
            <div className="rounded-full bg-card border border-border px-4 py-2 text-xs font-medium text-muted-foreground shadow">
              Loading places…
            </div>
          </div>
        )}

        {/* Legend overlay — sits inside the map at bottom-left */}
        <div className="absolute bottom-8 left-2 z-[1000] flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full border border-border/50 px-3 py-1 text-[10px] text-muted-foreground pointer-events-none">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> Community</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Saved</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> External</span>
        </div>
      </div>
    </div>
  );
}