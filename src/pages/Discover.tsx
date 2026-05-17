import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, List, Map } from "lucide-react";
import {
  getUserLocation,
  saveUserLocation,
  listGroups,
  suggestToGroup,
  getCurrentUser,
} from "@/lib/api";
import {
  ActivityType,
  DiscoverPlace,
  FriendGroup,
  MapPin as MapPinType,
  PlaceCategory,
  UserLocation,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DiscoverMap, { PLACE_CATEGORY_CONFIG } from "@/components/DiscoverMap";
import {
  loadRegion,
  invalidateRegionCache,
  placeToMapPin,
  getFavorites,
  getAllCustomPlaces,
  getReviews,
  getComments,
} from "@/lib/places";

type TimeSlot = "morning" | "afternoon" | "evening";

const TIME_LABELS: Record<TimeSlot, string> = {
  morning: "🌅 Morning",
  afternoon: "☀️ Afternoon",
  evening: "🌙 Evening",
};

const CATEGORY_TO_ACTIVITY: Record<PlaceCategory, ActivityType> = {
  cafe: "coffee",
  bar: "bar",
  restaurant: "lunch",
  library: "study",
  park: "walk",
  museum: "event",
  viewpoint: "walk",
  study_spot: "study",
  event_venue: "event",
  public_space: "walk",
  sports: "walk",
  other: "event",
};

const SWISS_CITIES: Record<string, { lat: number; lng: number }> = {
  "zürich": { lat: 47.3769, lng: 8.5417 },
  zurich: { lat: 47.3769, lng: 8.5417 },
  rapperswil: { lat: 47.2265, lng: 8.8172 },
  "rapperswil-jona": { lat: 47.2265, lng: 8.8172 },
  horgen: { lat: 47.2576, lng: 8.5985 },
  "rüti": { lat: 47.2579, lng: 8.8502 },
  ruti: { lat: 47.2579, lng: 8.8502 },
  winterthur: { lat: 47.5006, lng: 8.7241 },
  wetzikon: { lat: 47.3211, lng: 8.7978 },
  uster: { lat: 47.3516, lng: 8.72 },
  "dübendorf": { lat: 47.3963, lng: 8.6193 },
  dubendorf: { lat: 47.3963, lng: 8.6193 },
  schlieren: { lat: 47.3975, lng: 8.4484 },
  dietikon: { lat: 47.4025, lng: 8.401 },
  "bülach": { lat: 47.5207, lng: 8.5403 },
  bulach: { lat: 47.5207, lng: 8.5403 },
  kloten: { lat: 47.4517, lng: 8.5858 },
  adliswil: { lat: 47.3097, lng: 8.528 },
  "küsnacht": { lat: 47.3184, lng: 8.5893 },
  kusnacht: { lat: 47.3184, lng: 8.5893 },
  thalwil: { lat: 47.2893, lng: 8.5643 },
  opfikon: { lat: 47.4313, lng: 8.5685 },
  "männedorf": { lat: 47.2533, lng: 8.7073 },
  mannedorf: { lat: 47.2533, lng: 8.7073 },
  "stäfa": { lat: 47.2391, lng: 8.7294 },
  stafa: { lat: 47.2391, lng: 8.7294 },
  meilen: { lat: 47.2681, lng: 8.6438 },
  zollikon: { lat: 47.3362, lng: 8.5741 },
  maur: { lat: 47.3556, lng: 8.7041 },
  volketswil: { lat: 47.3829, lng: 8.7573 },
  effretikon: { lat: 47.4175, lng: 8.7203 },
  "pfäffikon": { lat: 47.3651, lng: 8.7834 },
  pfaffikon: { lat: 47.3651, lng: 8.7834 },
  wald: { lat: 47.2813, lng: 8.9248 },
  gossau: { lat: 47.3456, lng: 8.7706 },
  hinwil: { lat: 47.2971, lng: 8.8484 },
  bauma: { lat: 47.3769, lng: 8.8822 },
  bubikon: { lat: 47.2681, lng: 8.8265 },
  "küsnacht zh": { lat: 47.3184, lng: 8.5893 },
  richterswil: { lat: 47.2092, lng: 8.7004 },
  "wädenswil": { lat: 47.2258, lng: 8.6726 },
  wadenswil: { lat: 47.2258, lng: 8.6726 },
  lachen: { lat: 47.1977, lng: 8.8532 },
  schmerikon: { lat: 47.2219, lng: 8.9474 },
  uznach: { lat: 47.2258, lng: 8.9923 },
  bern: { lat: 46.948, lng: 7.4474 },
  basel: { lat: 47.5596, lng: 7.5886 },
  genf: { lat: 46.2044, lng: 6.1432 },
  geneva: { lat: 46.2044, lng: 6.1432 },
  lausanne: { lat: 46.5197, lng: 6.6323 },
  luzern: { lat: 47.0502, lng: 8.3093 },
  lucerne: { lat: 47.0502, lng: 8.3093 },
  "st. gallen": { lat: 47.4245, lng: 9.3767 },
  "st gallen": { lat: 47.4245, lng: 9.3767 },
  lugano: { lat: 46.0037, lng: 8.9511 },
  biel: { lat: 47.1368, lng: 7.2467 },
  thun: { lat: 46.758, lng: 7.628 },
  schaffhausen: { lat: 47.696, lng: 8.6351 },
  frauenfeld: { lat: 47.5587, lng: 8.8975 },
  chur: { lat: 46.8499, lng: 9.5329 },
  sion: { lat: 46.2333, lng: 7.3667 },
  aarau: { lat: 47.3924, lng: 8.0444 },
  zug: { lat: 47.1662, lng: 8.5169 },
  solothurn: { lat: 47.2088, lng: 7.5323 },
  bellinzona: { lat: 46.1954, lng: 9.0244 },
};

function lookupCity(query: string): { lat: number; lng: number } | null {
  const key = query.trim().toLowerCase();
  return SWISS_CITIES[key] ?? null;
}

function getCitySuggestions(partial: string): string[] {
  const q = partial.trim().toLowerCase();
  if (q.length < 2) return [];

  const displayNames: Record<string, string> = {
    "zürich": "Zürich",
    zurich: "Zürich",
    rapperswil: "Rapperswil",
    "rapperswil-jona": "Rapperswil-Jona",
    horgen: "Horgen",
    "rüti": "Rüti",
    ruti: "Rüti",
    winterthur: "Winterthur",
    wetzikon: "Wetzikon",
    uster: "Uster",
    "dübendorf": "Dübendorf",
    dubendorf: "Dübendorf",
    schlieren: "Schlieren",
    dietikon: "Dietikon",
    "bülach": "Bülach",
    bulach: "Bülach",
    kloten: "Kloten",
    adliswil: "Adliswil",
    "küsnacht": "Küsnacht",
    kusnacht: "Küsnacht",
    thalwil: "Thalwil",
    opfikon: "Opfikon",
    "männedorf": "Männedorf",
    mannedorf: "Männedorf",
    "stäfa": "Stäfa",
    stafa: "Stäfa",
    meilen: "Meilen",
    zollikon: "Zollikon",
    maur: "Maur",
    volketswil: "Volketswil",
    effretikon: "Effretikon",
    "pfäffikon": "Pfäffikon",
    pfaffikon: "Pfäffikon",
    wald: "Wald",
    gossau: "Gossau",
    hinwil: "Hinwil",
    bauma: "Bauma",
    bubikon: "Bubikon",
    richterswil: "Richterswil",
    "wädenswil": "Wädenswil",
    wadenswil: "Wädenswil",
    lachen: "Lachen",
    schmerikon: "Schmerikon",
    uznach: "Uznach",
    bern: "Bern",
    basel: "Basel",
    genf: "Genf",
    geneva: "Geneva",
    lausanne: "Lausanne",
    luzern: "Luzern",
    lucerne: "Lucerne",
    "st. gallen": "St. Gallen",
    "st gallen": "St. Gallen",
    lugano: "Lugano",
    biel: "Biel",
    thun: "Thun",
    schaffhausen: "Schaffhausen",
    frauenfeld: "Frauenfeld",
    chur: "Chur",
    sion: "Sion",
    aarau: "Aarau",
    zug: "Zug",
    solothurn: "Solothurn",
    bellinzona: "Bellinzona",
  };

  return Object.entries(displayNames)
    .filter(([key]) => key.startsWith(q))
    .reduce((acc: string[], [, value]) => {
      if (!acc.includes(value)) acc.push(value);
      return acc;
    }, [])
    .slice(0, 6);
}

type TimeWeight = Partial<Record<PlaceCategory, number>>;

const TIME_WEIGHTS: Record<TimeSlot, TimeWeight> = {
  morning: {
    cafe: 8,
    library: 7,
    study_spot: 7,
    restaurant: 2,
    park: 3,
    sports: 4,
    museum: 2,
    viewpoint: 2,
    public_space: 2,
    bar: 0,
    event_venue: 0,
    other: 1,
  },
  afternoon: {
    park: 8,
    sports: 7,
    public_space: 6,
    viewpoint: 5,
    cafe: 5,
    restaurant: 4,
    museum: 4,
    library: 3,
    study_spot: 3,
    bar: 1,
    event_venue: 2,
    other: 2,
  },
  evening: {
    bar: 9,
    restaurant: 8,
    event_venue: 7,
    cafe: 4,
    public_space: 3,
    viewpoint: 3,
    park: 2,
    library: 1,
    study_spot: 2,
    sports: 1,
    museum: 1,
    other: 2,
  },
};

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

function scorePlaceFor(
  place: DiscoverPlace,
  tod: TimeSlot,
  location: UserLocation | null,
  favoriteIds: string[],
): number {
  let score = 0;

  if (place.source === "manual" && place.isPublic === true) {
    score += 20;
  } else if (place.source === "mock") {
    score += 5;
  } else if (place.source === "osm") {
    score += 0;
  }

  score += Math.min(place.favoriteCount * 0.8, 10);
  score += Math.min(place.commentCount * 0.5, 5);
  score += Math.min(place.suggestedByGroupIds.length * 2, 6);

  if (favoriteIds.includes(place.id)) score += 8;

  const catWeight = TIME_WEIGHTS[tod][place.category] ?? 1;
  const capMultiplier = CATEGORY_DOMINANCE_CAP[place.category] ?? 1;
  score += catWeight * capMultiplier;

  if (location) {
    if (place.city.toLowerCase() === location.city.toLowerCase()) score += 3;

    if (
      location.area &&
      place.area?.toLowerCase().includes(location.area.toLowerCase())
    ) {
      score += 5;
    }
  }

  score += Math.random() * 0.8;

  const reviews = getReviews(place.id);
  if (reviews.length > 0) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    score += avg * 1.5;
  }

  return score;
}

async function geocodeQuery(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  const local = lookupCity(query);
  if (local) return local;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query + ", Switzerland",
    )}&format=json&limit=1`;

    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch {}

  return null;
}

function bboxAround(
  lat: number,
  lng: number,
  pad = 0.12,
): [number, number, number, number] {
  return [lat - pad, lng - pad, lat + pad, lng + pad];
}

export default function Discover() {
  const navigate = useNavigate();

  const [location, setLocation] = useState<UserLocation | null>(null);
  const [editingLoc, setEditingLoc] = useState(false);
  const [draftCity, setDraftCity] = useState("");
  const [draftArea, setDraftArea] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);

  const [view, setView] = useState<"list" | "map">(
    () => (sessionStorage.getItem("discover_view") as "list" | "map") ?? "list",
  );

  const [mapMounted, setMapMounted] = useState(
    () => sessionStorage.getItem("discover_view") === "map",
  );

  const [timeSlot, setTimeSlot] = useState<TimeSlot>(
    () =>
      (sessionStorage.getItem("discover_timeslot") as TimeSlot) ??
      currentTimeSlot(),
  );

  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | "all">(
    () =>
      (sessionStorage.getItem("discover_category") as PlaceCategory | "all") ??
      "all",
  );

  const [allPlaces, setAllPlaces] = useState<DiscoverPlace[]>([]);
  const [mapPins, setMapPins] = useState<MapPinType[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    () => {
      try {
        const s = sessionStorage.getItem("discover_map_center");
        if (s) return JSON.parse(s);
      } catch {}

      return { lat: 47.3769, lng: 8.5417 };
    },
  );

  const [currentMapBounds, setCurrentMapBounds] = useState<
    [number, number, number, number] | undefined
  >();

  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [meId, setMeId] = useState("");

  const loadData = async (
    force = false,
    bbox?: [number, number, number, number],
    userId?: string,
  ) => {
    setMapLoading(true);

    const uid = userId ?? meId;

    try {
      if (force) invalidateRegionCache();

      const places = await loadRegion(force, bbox, uid || undefined);

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

  useEffect(() => {
    if (view !== "map") return;

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
    if (!draftCity.trim()) {
      toast.error("City is required");
      return;
    }

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
      toast.success(
        `Showing places around ${draftArea.trim() || draftCity.trim()}`,
      );
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

    const coords = lookupCity(city);
    if (coords) setMapCenter({ lat: coords.lat, lng: coords.lng });
  };

  const handleSuggest = async (groupId: string, pin: MapPinType) => {
    const place = allPlaces.find((p) => p.id === (pin.placeId ?? pin.id));

    if (!place) {
      toast.error("Place not found");
      return;
    }

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

  const filteredPlaces = allPlaces
    .filter((p) => {
      if (
        p.source === "manual" &&
        !p.isPublic &&
        p.addedByUserId &&
        p.addedByUserId !== meId
      ) {
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

  const listCategories: {
    value: PlaceCategory | "all";
    label: string;
    emoji: string;
  }[] = [
    { value: "all", label: "All", emoji: "✨" },
    ...Object.entries(PLACE_CATEGORY_CONFIG).map(([k, v]) => ({
      value: k as PlaceCategory,
      label: v.label,
      emoji: v.emoji,
    })),
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      <header className="safe-top shrink-0 border-b border-border/70 bg-background/95 px-4 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h1 className="shrink-0 text-2xl font-extrabold tracking-tight">
            Discover<span className="text-[#DA2C43]">.</span>
          </h1>

          <button
            onClick={startEditLoc}
            className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-primary-soft/70 hover:text-primary"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {location ? location.city : "Set location"}
              {location?.area ? ` · ${location.area}` : ""}
            </span>
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-secondary/80 p-1">
            <button
              onClick={() => changeView("list")}
              className={`flex items-center gap-1.5 rounded-full px-7 py-2.5 text-sm font-semibold transition-all ${
                view === "list"
                  ? "bg-[#DA2C43] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-primary-soft hover:text-primary"
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>

            <button
              onClick={() => changeView("map")}
              className={`flex items-center gap-1.5 rounded-full px-7 py-2.5 text-sm font-semibold transition-all ${
                view === "map"
                  ? "bg-[#DA2C43] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-primary-soft hover:text-primary"
              }`}
            >
              <Map className="h-4 w-4" />
              Map
            </button>
          </div>
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden pb-28">
        {editingLoc && (
          <div className="m-4 space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold">Where are you based?</p>

            <div className="relative">
              <label className="mb-1 block text-xs text-muted-foreground">
                City *
              </label>

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
                className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
              />

              {citySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                  {citySuggestions.map((s) => (
                    <button
                      key={s}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-primary-soft/70 hover:text-primary"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectCitySuggestion(s);
                      }}
                    >
                      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Area / Neighbourhood{" "}
                <span className="text-muted-foreground/60">(optional)</span>
              </label>

              <Input
                placeholder="e.g. Langstrasse, Oerlikon, Seefeld"
                value={draftArea}
                onChange={(e) => setDraftArea(e.target.value)}
                className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
              />

              <p className="mt-1 text-xs text-muted-foreground">
                If set, the map and suggestions will centre here
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-full bg-[#DA2C43] text-white hover:bg-[#c9273c]"
                onClick={saveLocation}
              >
                Save
              </Button>

              {location && (
                <Button
                  variant="outline"
                  className="flex-1 rounded-full border-border bg-card hover:bg-primary-soft/70 hover:text-primary"
                  onClick={() => {
                    setEditingLoc(false);
                    setCitySuggestions([]);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: view === "map" ? "block" : "none" }}>
          {mapMounted && (
            <div className="px-4 pb-4 pt-3">
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
                  invalidateRegionCache();
                }}
                onViewDetails={(pin) =>
                  navigate(`/places/${pin.placeId ?? pin.id}`)
                }
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

        {view === "list" && (
          <>
            <div className="flex gap-2 px-4 pt-3">
              {(["morning", "afternoon", "evening"] as TimeSlot[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTimeSlot(t);
                    sessionStorage.setItem("discover_timeslot", t);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                    timeSlot === t
                      ? "border-[#DA2C43] bg-[#DA2C43] text-white"
                      : "border-border bg-card text-muted-foreground hover:bg-primary-soft/70 hover:text-primary"
                  }`}
                >
                  {TIME_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-1 pt-2">
              {listCategories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    setCategoryFilter(c.value);
                    sessionStorage.setItem("discover_category", c.value);
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                    categoryFilter === c.value
                      ? "border-[#DA2C43] bg-[#DA2C43] text-white"
                      : "border-border bg-card text-muted-foreground hover:bg-primary-soft/70 hover:text-primary"
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 px-4 pb-4 pt-3">
              {mapLoading ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Loading places…
                </p>
              ) : filteredPlaces.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No places for this filter.
                </p>
              ) : (
                filteredPlaces.map((place) => {
                  const cfg = PLACE_CATEGORY_CONFIG[place.category];
                  const isFav = favoriteIds.includes(place.id);
                  const isUserPublic =
                    place.source === "manual" && place.isPublic === true;
                  const isUserPrivate =
                    place.source === "manual" && !place.isPublic;

                  return (
                    <div
                      key={place.id}
                      className="cursor-pointer space-y-2 rounded-3xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-primary-soft/70"
                      onClick={() => navigate(`/places/${place.id}`)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-semibold"
                              style={{
                                background: cfg.color + "22",
                                color: cfg.color,
                              }}
                            >
                              {cfg.emoji} {cfg.label}
                            </span>

                            {place.area && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {place.area}
                              </span>
                            )}

                            {isFav && (
                              <span className="text-xs font-semibold text-[#DA2C43]">
                                ❤️ Saved
                              </span>
                            )}

                            {isUserPublic && (
                              <span className="text-xs font-semibold text-[#DA2C43]">
                                👥 Community
                              </span>
                            )}

                            {isUserPrivate && (
                              <span className="text-xs text-muted-foreground">
                                🔒 Private
                              </span>
                            )}
                          </div>

                          <p className="font-semibold text-foreground">
                            {place.name}
                          </p>

                          {(() => {
                            const reviews = getReviews(place.id);
                            const comments = getComments(place.id);
                            const avgRating = reviews.length
                              ? reviews.reduce((s, r) => s + r.rating, 0) /
                                reviews.length
                              : null;
                            const snippet =
                              place.description ||
                              reviews.find((r) => r.body)?.body ||
                              comments[0]?.body;

                            return (
                              <>
                                {avgRating !== null && (
                                  <div className="mt-0.5 flex items-center gap-1">
                                    {"★★★★★".split("").map((_, i) => (
                                      <span
                                        key={i}
                                        className="text-xs"
                                        style={{
                                          color:
                                            i < Math.round(avgRating)
                                              ? "#f59e0b"
                                              : "#d1d5db",
                                        }}
                                      >
                                        ★
                                      </span>
                                    ))}
                                    <span className="ml-0.5 text-xs text-muted-foreground">
                                      {avgRating.toFixed(1)} ({reviews.length})
                                    </span>
                                  </div>
                                )}

                                {snippet && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    {snippet}
                                  </p>
                                )}
                              </>
                            );
                          })()}
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
    </div>
  );
}