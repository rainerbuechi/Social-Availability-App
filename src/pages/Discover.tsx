import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, List, Map } from "lucide-react";
import { getUserLocation, saveUserLocation, listGroups, suggestToGroup, getCurrentUser } from "@/lib/api";
import {
  ActivityType, DiscoverPlace, FriendGroup,
  MapPin as MapPinType, PlaceCategory, UserLocation,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DiscoverMap, { PLACE_CATEGORY_CONFIG } from "@/components/DiscoverMap";
import {
  loadRegion, invalidateRegionCache, placeToMapPin,
  getFavorites, getAllCustomPlaces,
} from "@/lib/places";

type TimeSlot = "morning" | "afternoon" | "evening";

const TIME_LABELS: Record<TimeSlot, string> = {
  morning: "🌅 Morning",
  afternoon: "☀️ Afternoon",
  evening: "🌙 Evening",
};

const CATEGORY_TO_ACTIVITY: Record<PlaceCategory, ActivityType> = {
  cafe: "coffee", bar: "bar", restaurant: "lunch", library: "study",
  park: "walk", museum: "event", viewpoint: "walk", study_spot: "study",
  event_venue: "event", public_space: "walk", sports: "walk", other: "event",
};

/* ── Swiss city coordinate dictionary ───────────────────────────────────── */
// Used for instant local lookups before falling back to Nominatim geocoding.

const SWISS_CITIES: Record<string, { lat: number; lng: number }> = {
  // Primary focus area — ZH lake region
  "zürich":            { lat: 47.3769, lng: 8.5417 },
  "zurich":            { lat: 47.3769, lng: 8.5417 },
  "rapperswil":        { lat: 47.2265, lng: 8.8172 },
  "rapperswil-jona":   { lat: 47.2265, lng: 8.8172 },
  "horgen":            { lat: 47.2576, lng: 8.5985 },
  "rüti":              { lat: 47.2579, lng: 8.8502 },
  "ruti":              { lat: 47.2579, lng: 8.8502 },
  "winterthur":        { lat: 47.5006, lng: 8.7241 },
  "wetzikon":          { lat: 47.3211, lng: 8.7978 },
  "uster":             { lat: 47.3516, lng: 8.7200 },
  "dübendorf":         { lat: 47.3963, lng: 8.6193 },
  "dubendorf":         { lat: 47.3963, lng: 8.6193 },
  "schlieren":         { lat: 47.3975, lng: 8.4484 },
  "dietikon":          { lat: 47.4025, lng: 8.4010 },
  "bülach":            { lat: 47.5207, lng: 8.5403 },
  "bulach":            { lat: 47.5207, lng: 8.5403 },
  "kloten":            { lat: 47.4517, lng: 8.5858 },
  "adliswil":          { lat: 47.3097, lng: 8.5280 },
  "küsnacht":          { lat: 47.3184, lng: 8.5893 },
  "kusnacht":          { lat: 47.3184, lng: 8.5893 },
  "thalwil":           { lat: 47.2893, lng: 8.5643 },
  "opfikon":           { lat: 47.4313, lng: 8.5685 },
  "männedorf":         { lat: 47.2533, lng: 8.7073 },
  "mannedorf":         { lat: 47.2533, lng: 8.7073 },
  "stäfa":             { lat: 47.2391, lng: 8.7294 },
  "stafa":             { lat: 47.2391, lng: 8.7294 },
  "meilen":            { lat: 47.2681, lng: 8.6438 },
  "zollikon":          { lat: 47.3362, lng: 8.5741 },
  "maur":              { lat: 47.3556, lng: 8.7041 },
  "volketswil":        { lat: 47.3829, lng: 8.7573 },
  "effretikon":        { lat: 47.4175, lng: 8.7203 },
  "pfäffikon":         { lat: 47.3651, lng: 8.7834 },
  "pfaffikon":         { lat: 47.3651, lng: 8.7834 },
  "wald":              { lat: 47.2813, lng: 8.9248 },
  "gossau":            { lat: 47.3456, lng: 8.7706 },
  "hinwil":            { lat: 47.2971, lng: 8.8484 },
  "bauma":             { lat: 47.3769, lng: 8.8822 },
  "bubikon":           { lat: 47.2681, lng: 8.8265 },
  "küsnacht zh":       { lat: 47.3184, lng: 8.5893 },
  "richterswil":       { lat: 47.2092, lng: 8.7004 },
  "wädenswil":         { lat: 47.2258, lng: 8.6726 },
  "wadenswil":         { lat: 47.2258, lng: 8.6726 },
  "lachen":            { lat: 47.1977, lng: 8.8532 },
  "schmerikon":        { lat: 47.2219, lng: 8.9474 },
  "uznach":            { lat: 47.2258, lng: 8.9923 },
  // Major Swiss cities (broader coverage)
  "bern":              { lat: 46.9480, lng: 7.4474 },
  "basel":             { lat: 47.5596, lng: 7.5886 },
  "genf":              { lat: 46.2044, lng: 6.1432 },
  "geneva":            { lat: 46.2044, lng: 6.1432 },
  "lausanne":          { lat: 46.5197, lng: 6.6323 },
  "luzern":            { lat: 47.0502, lng: 8.3093 },
  "lucerne":           { lat: 47.0502, lng: 8.3093 },
  "st. gallen":        { lat: 47.4245, lng: 9.3767 },
  "st gallen":         { lat: 47.4245, lng: 9.3767 },
  "lugano":            { lat: 46.0037, lng: 8.9511 },
  "biel":              { lat: 47.1368, lng: 7.2467 },
  "thun":              { lat: 46.7580, lng: 7.6280 },
  "schaffhausen":      { lat: 47.6960, lng: 8.6351 },
  "frauenfeld":        { lat: 47.5587, lng: 8.8975 },
  "chur":              { lat: 46.8499, lng: 9.5329 },
  "sion":              { lat: 46.2333, lng: 7.3667 },
  "aarau":             { lat: 47.3924, lng: 8.0444 },
  "zug":               { lat: 47.1662, lng: 8.5169 },
  "solothurn":         { lat: 47.2088, lng: 7.5323 },
  "bellinzona":        { lat: 46.1954, lng: 9.0244 },
};

function lookupCity(query: string): { lat: number; lng: number } | null {
  const key = query.trim().toLowerCase();
  return SWISS_CITIES[key] ?? null;
}

function getCitySuggestions(partial: string): string[] {
  const q = partial.trim().toLowerCase();
  if (q.length < 2) return [];
  // Canonical display names — deduplicate aliases
  const displayNames: Record<string, string> = {
    "zürich": "Zürich", "zurich": "Zürich",
    "rapperswil": "Rapperswil", "rapperswil-jona": "Rapperswil-Jona",
    "horgen": "Horgen", "rüti": "Rüti", "ruti": "Rüti",
    "winterthur": "Winterthur", "wetzikon": "Wetzikon",
    "uster": "Uster", "dübendorf": "Dübendorf", "dubendorf": "Dübendorf",
    "schlieren": "Schlieren", "dietikon": "Dietikon",
    "bülach": "Bülach", "bulach": "Bülach",
    "kloten": "Kloten", "adliswil": "Adliswil",
    "küsnacht": "Küsnacht", "kusnacht": "Küsnacht",
    "thalwil": "Thalwil", "opfikon": "Opfikon",
    "männedorf": "Männedorf", "mannedorf": "Männedorf",
    "stäfa": "Stäfa", "stafa": "Stäfa",
    "meilen": "Meilen", "zollikon": "Zollikon",
    "maur": "Maur", "volketswil": "Volketswil",
    "effretikon": "Effretikon", "pfäffikon": "Pfäffikon", "pfaffikon": "Pfäffikon",
    "wald": "Wald", "gossau": "Gossau", "hinwil": "Hinwil", "bauma": "Bauma",
    "bubikon": "Bubikon", "richterswil": "Richterswil",
    "wädenswil": "Wädenswil", "wadenswil": "Wädenswil",
    "lachen": "Lachen", "schmerikon": "Schmerikon", "uznach": "Uznach",
    "bern": "Bern", "basel": "Basel",
    "genf": "Genf", "geneva": "Geneva",
    "lausanne": "Lausanne", "luzern": "Luzern", "lucerne": "Lucerne",
    "st. gallen": "St. Gallen", "st gallen": "St. Gallen",
    "lugano": "Lugano", "biel": "Biel", "thun": "Thun",
    "schaffhausen": "Schaffhausen", "frauenfeld": "Frauenfeld",
    "chur": "Chur", "sion": "Sion", "aarau": "Aarau",
    "zug": "Zug", "solothurn": "Solothurn", "bellinzona": "Bellinzona",
  };
  const seen = new Set<string>();
  return Object.entries(displayNames)
    .filter(([k]) => k.startsWith(q) && !seen.has(displayNames[k]) && seen.add(displayNames[k]) !== undefined)
    // actually the above won't work well. Let me filter differently:
    // .filter(([k, v]) => k.startsWith(q))
    // We'll deduplicate by display value
    .reduce((acc: string[], [_k, v]) => {
      if (!acc.includes(v)) acc.push(v);
      return acc;
    }, [])
    .slice(0, 6);
}

/* ── Time-of-day scoring weights ─────────────────── */

type TimeWeight = Partial<Record<PlaceCategory, number>>;

const TIME_WEIGHTS: Record<TimeSlot, TimeWeight> = {
  morning: {
    cafe:         8,   // Primary morning destination
    library:      7,   // Study mornings
    study_spot:   7,
    restaurant:   2,   // Breakfast exists but not dominant
    park:         3,   // Morning walks
    sports:       4,   // Morning workouts
    museum:       2,
    viewpoint:    2,
    public_space: 2,
    bar:          0,
    event_venue:  0,
    other:        1,
  },
  afternoon: {
    park:         8,   // Primary afternoon destination
    sports:       7,   // Afternoon activity
    public_space: 6,   // Outdoor hangouts
    viewpoint:    5,   // Afternoon light
    cafe:         5,   // Afternoon coffee
    restaurant:   4,   // Lunch
    museum:       4,
    library:      3,
    study_spot:   3,
    bar:          1,   // Early afternoon possible but low
    event_venue:  2,
    other:        2,
  },
  evening: {
    bar:          9,   // Primary evening destination
    restaurant:   8,   // Dinner
    event_venue:  7,   // Events happen evenings
    cafe:         4,   // Social cafes in evening
    public_space: 3,   // Evening strolls
    viewpoint:    3,   // Sunset
    park:         2,
    library:      1,   // Some open late
    study_spot:   2,
    sports:       1,
    museum:       1,
    other:        2,
  },
};

// Restaurants and viewpoints should not dominate — apply a cap multiplier
const CATEGORY_DOMINANCE_CAP: Partial<Record<PlaceCategory, number>> = {
  restaurant: 0.7,
  viewpoint: 0.8,
};

function currentTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/* ── Main scoring function ───────────────────────── */

function scorePlaceFor(
  place: DiscoverPlace,
  tod: TimeSlot,
  location: UserLocation | null,
  favoriteIds: string[],
): number {
  let score = 0;

  // ── 1. Source priority ──────────────────────────
  // Community-added public places get the highest base boost
  if (place.source === "manual" && place.isPublic === true) {
    score += 20; // Community places lead
  } else if (place.source === "mock") {
    score += 5;  // Curated places above raw OSM
  } else if (place.source === "osm") {
    score += 0;  // External data — lowest base
  }

  // ── 2. Social signal boost ──────────────────────
  score += Math.min(place.favoriteCount * 0.8, 10);   // saves/favorites
  score += Math.min(place.commentCount * 0.5, 5);     // comments = engagement
  // suggestedByGroupIds = group recommendations
  score += Math.min(place.suggestedByGroupIds.length * 2, 6);

  // ── 3. User's own favorites ─────────────────────
  if (favoriteIds.includes(place.id)) score += 8;

  // ── 4. Time-of-day weights ──────────────────────
  const catWeight = TIME_WEIGHTS[tod][place.category] ?? 1;
  const capMultiplier = CATEGORY_DOMINANCE_CAP[place.category] ?? 1.0;
  score += catWeight * capMultiplier;

  // ── 5. Location proximity ───────────────────────
  if (location) {
    if (place.city.toLowerCase() === location.city.toLowerCase()) score += 3;
    if (
      location.area &&
      place.area?.toLowerCase().includes(location.area.toLowerCase())
    ) score += 5;
  }

  // ── 6. Randomization fallback ───────────────────
  // Small jitter to prevent identical scores causing stale ordering
  score += Math.random() * 0.8;

  return score;
}

/* ── Geocoding helpers ───────────────────────────── */

async function geocodeQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  // 1. Check local dict first (instant, no network)
  const local = lookupCity(query);
  if (local) return local;

  // 2. Fall back to Nominatim for unknown/area queries
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query + ", Switzerland",
    )}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function bboxAround(lat: number, lng: number, pad = 0.12): [number, number, number, number] {
  return [lat - pad, lng - pad, lat + pad, lng + pad];
}

/* ── Component ───────────────────────────────────── */

export default function Discover() {
  const navigate = useNavigate();

  const [location, setLocation] = useState<UserLocation | null>(null);
  const [editingLoc, setEditingLoc] = useState(false);
  const [draftCity, setDraftCity] = useState("");
  const [draftArea, setDraftArea] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);

  const [view, setView] = useState<"list" | "map">(() =>
    (sessionStorage.getItem("discover_view") as "list" | "map") ?? "list",
  );
  const [mapMounted, setMapMounted] = useState(() =>
    sessionStorage.getItem("discover_view") === "map",
  );

  const [timeSlot, setTimeSlot] = useState<TimeSlot>(
    () => (sessionStorage.getItem("discover_timeslot") as TimeSlot) ?? currentTimeSlot()
  );
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | "all">(
    () => (sessionStorage.getItem("discover_category") as PlaceCategory | "all") ?? "all"
  );
  const [allPlaces, setAllPlaces] = useState<DiscoverPlace[]>([]);
  const [mapPins, setMapPins] = useState<MapPinType[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => {
    try {
      const s = sessionStorage.getItem("discover_map_center");
      if (s) return JSON.parse(s);
    } catch {}
    return { lat: 47.3769, lng: 8.5417 };
  });
  const [currentMapBounds, setCurrentMapBounds] = useState<[number, number, number, number] | undefined>();
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [meId, setMeId] = useState("");

  const loadData = async (
    force = false,
    bbox?: [number, number, number, number],
    userId?: string,            // pass directly on first load before meId state is set
  ) => {
    setMapLoading(true);
    const uid = userId ?? meId;
    try {
      if (force) invalidateRegionCache();
      const places = await loadRegion(force, bbox, uid || undefined);
      // Always inject own places regardless of what bbox was loaded
      const ownPlaces = uid
        ? getAllCustomPlaces().filter((p) => p.addedByUserId === uid)
        : [];
      const loadedIds = new Set(places.map((p) => p.id));
      const merged = [
        ...ownPlaces.filter((p) => !loadedIds.has(p.id)),
        ...places,
      ];
      setAllPlaces(merged);
      setMapPins(merged.map(placeToMapPin));
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const [loc, gs, u] = await Promise.all([
        getUserLocation(),
        listGroups(),
        getCurrentUser(),
      ]);
      setGroups(gs);
      if (u) {
        setMeId(u.id);
        setFavoriteIds(getFavorites(u.id).map((f) => f.placeId));
      }
      setLocation(loc);
      if (!loc) {
        setEditingLoc(true);
      } else if (loc.lat && loc.lng) {
        setMapCenter({ lat: loc.lat, lng: loc.lng });
        loadData(false, bboxAround(loc.lat, loc.lng), u?.id);
        return;
      }
      loadData(false, undefined, u?.id);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock page scroll while map is active so pinch-zoom doesn't fight with page scroll
  useEffect(() => {
    if (view !== "map") return;
    // Prevent the page from scrolling behind the map.
    // Uses overflow:hidden on both html+body which works across
    // Android Chrome, iOS Safari PWA, and desktop browsers.
    const html = document.documentElement;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [view]);

  const changeView = (v: "list" | "map") => {
    setView(v);
    sessionStorage.setItem("discover_view", v);
    if (v === "map") setMapMounted(true);
  };

  const saveLocation = async () => {
    if (!draftCity.trim()) { toast.error("City is required"); return; }
    toast("Locating…");
    const query = draftArea.trim() || draftCity.trim();
    const coords = await geocodeQuery(query);
    const loc: UserLocation = {
      city: draftCity.trim(),
      area: draftArea.trim() || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
    };
    await saveUserLocation(loc);
    setLocation(loc);
    setEditingLoc(false);
    setCitySuggestions([]);
    if (coords) {
      setMapCenter({ lat: coords.lat, lng: coords.lng });
      invalidateRegionCache();
      loadData(true, bboxAround(coords.lat, coords.lng));
      toast.success(`Showing places around ${draftArea.trim() || draftCity.trim()}`);
    } else {
      toast.success("Location saved");
    }
  };

  const startEditLoc = () => {
    setDraftCity(location?.city ?? "");
    setDraftArea(location?.area ?? "");
    setCitySuggestions([]);
    setEditingLoc(true);
  };

  const handleCityInput = (val: string) => {
    setDraftCity(val);
    setCitySuggestions(getCitySuggestions(val));
  };

  const selectCitySuggestion = async (city: string) => {
    setDraftCity(city);
    setCitySuggestions([]);
    // Immediately resolve coords for map preview
    const coords = lookupCity(city);
    if (coords) setMapCenter({ lat: coords.lat, lng: coords.lng });
  };

  const handleSuggest = async (groupId: string, pin: MapPinType) => {
    const place = allPlaces.find((p) => p.id === (pin.placeId ?? pin.id));
    if (!place) { toast.error("Place not found"); return; }
    await suggestToGroup(groupId, {
      title: place.name,
      type: CATEGORY_TO_ACTIVITY[place.category],
      area: place.area ?? place.city,
      description: place.description ?? "",
    });
    const group = groups.find((g) => g.id === groupId);
    toast.success(`Suggested "${place.name}" to ${group?.name ?? "group"} ✨`);
  };

  const handleMapBoundsChange = (
    bbox: [number, number, number, number],
    center: { lat: number; lng: number },
  ) => {
    setCurrentMapBounds(bbox);
    sessionStorage.setItem("discover_map_center", JSON.stringify(center));
  };

  // Sorted + filtered places for list view
  const filteredPlaces = allPlaces
    .filter((p) => {
      // Private places only visible to their creator
      if (p.source === "manual" && !p.isPublic && p.addedByUserId && p.addedByUserId !== meId) {
        return false;
      }
      return categoryFilter === "all" || p.category === categoryFilter;
    })
    .map((p) => ({
      place: p,
      score: scorePlaceFor(p, timeSlot, location, favoriteIds),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ place }) => place)
    .slice(0, 60);

  const listCategories: { value: PlaceCategory | "all"; label: string; emoji: string }[] = [
    { value: "all", label: "All", emoji: "✨" },
    ...Object.entries(PLACE_CATEGORY_CONFIG).map(([k, v]) => ({
      value: k as PlaceCategory,
      label: v.label,
      emoji: v.emoji,
    })),
  ];

  return (
    <div>
      {/* Header */}
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight shrink-0">
            Discover<span className="text-primary"> ✨</span>
          </h1>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex rounded-full border border-border bg-card p-0.5 shrink-0">
              <button
                onClick={() => changeView("list")}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <List className="h-3 w-3" /> List
              </button>
              <button
                onClick={() => changeView("map")}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Map className="h-3 w-3" /> Map
              </button>
            </div>
            <button
              onClick={startEditLoc}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {location ? location.city : "Set location"}
                {location?.area ? ` · ${location.area}` : ""}
              </span>
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {mapLoading ? "Loading places…" : `${allPlaces.length} places loaded`}
        </p>
      </header>

      {/* Location settings */}
      {editingLoc && (
        <div className="m-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Where are you based?</p>

          {/* City field with autocomplete */}
          <div className="relative">
            <label className="text-xs text-muted-foreground mb-1 block">City *</label>
            <Input
              placeholder="e.g. Zürich, Rapperswil, Wetzikon"
              value={draftCity}
              onChange={(e) => handleCityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setCitySuggestions([]);
                if (e.key === "Enter") {
                  setCitySuggestions([]);
                  saveLocation();
                }
              }}
              autoComplete="off"
            />
            {citySuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                {citySuggestions.map((s) => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur firing before click
                      selectCitySuggestion(s);
                    }}
                  >
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Area / Neighbourhood <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Langstrasse, Oerlikon, Seefeld"
              value={draftArea}
              onChange={(e) => setDraftArea(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              If set, the map and suggestions will centre here
            </p>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={saveLocation}>
              Save
            </Button>
            {location && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setEditingLoc(false); setCitySuggestions([]); }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Map view — always mounted after first visit, hidden via CSS when on list */}
      <div style={{ display: view === "map" ? "block" : "none" }}>
        {mapMounted && (
          <div className="px-4 pt-3 pb-4">
            <DiscoverMap
              pins={mapPins}
              centerLat={mapCenter.lat}
              centerLng={mapCenter.lng}
              loading={mapLoading}
              favoriteIds={favoriteIds}
              groups={groups}
              currentUserId={meId}
              onSuggest={handleSuggest}
              onPinAdded={(pin) => {
                setMapPins((prev) => [...prev, pin]);
                // Also add to allPlaces so list updates
                invalidateRegionCache();
              }}
              onViewDetails={(pin) => navigate(`/places/${pin.placeId ?? pin.id}`)}
              onRefresh={() =>
                loadData(
                  true,
                  currentMapBounds ??
                    (location?.lat && location?.lng
                      ? bboxAround(location.lat, location.lng)
                      : undefined),
                )
              }
              onBoundsChange={handleMapBoundsChange}
            />
          </div>
        )}
      </div>

      {/* List view */}
      {view === "list" && (
        <>
          {/* Time selector */}
          <div className="px-4 pt-3 flex gap-2">
            {(["morning", "afternoon", "evening"] as TimeSlot[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTimeSlot(t); sessionStorage.setItem("discover_timeslot", t); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeSlot === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {TIME_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {listCategories.map((c) => (
              <button
                key={c.value}
                onClick={() => { setCategoryFilter(c.value); sessionStorage.setItem("discover_category", c.value); }}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === c.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          {/* Place list */}
          <div className="px-4 pt-3 pb-24 space-y-2.5">
            {mapLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading places…</p>
            ) : filteredPlaces.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No places for this filter.
              </p>
            ) : (
              filteredPlaces.map((place) => {
                const cfg = PLACE_CATEGORY_CONFIG[place.category];
                const isFav = favoriteIds.includes(place.id);
                const isUserPublic = place.source === "manual" && place.isPublic === true;
                const isUserPrivate = place.source === "manual" && !place.isPublic;

                return (
                  <div
                    key={place.id}
                    className="rounded-2xl border border-border bg-card p-4 space-y-2 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => navigate(`/places/${place.id}`)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{ background: cfg.color + "22", color: cfg.color }}
                          >
                            {cfg.emoji} {cfg.label}
                          </span>
                          {place.area && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{place.area}
                            </span>
                          )}
                          {isFav && <span className="text-xs text-rose-500">❤️ Saved</span>}
                          {isUserPublic && (
                            <span className="text-xs font-semibold text-violet-600">
                              👥 Community
                            </span>
                          )}
                          {isUserPrivate && (
                            <span className="text-xs text-muted-foreground">🔒 Private</span>
                          )}
                        </div>
                        <p className="font-semibold text-foreground">{place.name}</p>
                        {place.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {place.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}