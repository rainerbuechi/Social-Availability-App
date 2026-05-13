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
  getFavorites,
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

const CATEGORY_TIME: Record<PlaceCategory, string[]> = {
  cafe: ["morning", "afternoon"], bar: ["evening"], restaurant: ["afternoon", "evening"],
  library: ["any"], park: ["any"], museum: ["morning", "afternoon"],
  viewpoint: ["any"], study_spot: ["any"], event_venue: ["evening"],
  public_space: ["any"], sports: ["morning", "afternoon"], other: ["any"],
};

function currentTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function scorePlaceFor(place: DiscoverPlace, tod: TimeSlot, location: UserLocation | null): number {
  let score = 0;
  const times = CATEGORY_TIME[place.category];
  if (times.includes("any") || times.includes(tod)) score += 2;
  if (location) {
    if (place.city.toLowerCase() === location.city.toLowerCase()) score += 1;
    if (location.area && place.area?.toLowerCase().includes(location.area.toLowerCase())) score += 3;
  }
  return score;
}

async function geocodeQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Switzerland")}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function bboxAround(lat: number, lng: number, pad = 0.18): [number, number, number, number] {
  return [lat - pad, lng - pad, lat + pad, lng + pad];
}

export default function Discover() {
  const navigate = useNavigate();

  const [location, setLocation] = useState<UserLocation | null>(null);
  const [editingLoc, setEditingLoc] = useState(false);
  const [draftCity, setDraftCity] = useState("");
  const [draftArea, setDraftArea] = useState("");

  const [view, setView] = useState<"list" | "map">(() =>
    (sessionStorage.getItem("discover_view") as "list" | "map") ?? "list"
  );
  const [mapMounted, setMapMounted] = useState(() =>
    sessionStorage.getItem("discover_view") === "map"
  );

  const [timeSlot, setTimeSlot] = useState<TimeSlot>(currentTimeSlot);
  const [categoryFilter, setCategoryFilter] = useState<PlaceCategory | "all">("all");
  const [allPlaces, setAllPlaces] = useState<DiscoverPlace[]>([]);
  const [mapPins, setMapPins] = useState<MapPinType[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 47.3769, lng: 8.5417 });
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [meId, setMeId] = useState("");

  const loadData = async (force = false, bbox?: [number, number, number, number]) => {
    setMapLoading(true);
    try {
      if (force) invalidateRegionCache();
      const places = await loadRegion(force, bbox);
      setAllPlaces(places);
      setMapPins(places.map(placeToMapPin));
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    getUserLocation().then((loc) => {
      setLocation(loc);
      if (!loc) setEditingLoc(true);
      else if (loc.lat && loc.lng) {
        setMapCenter({ lat: loc.lat, lng: loc.lng });
        loadData(false, bboxAround(loc.lat, loc.lng));
        return;
      }
      loadData();
    });
    listGroups().then((gs) => setGroups(gs));
    getCurrentUser().then((u) => {
      if (u) {
        setMeId(u.id);
        setFavoriteIds(getFavorites(u.id).map((f) => f.placeId));
      }
    });
  }, []);

  const changeView = (v: "list" | "map") => {
    setView(v);
    sessionStorage.setItem("discover_view", v);
    if (v === "map") setMapMounted(true);
  };

  const saveLocation = async () => {
    if (!draftCity.trim()) { toast.error("City is required"); return; }
    toast("Locating…");
    // Geocode area first, fall back to city
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
    setEditingLoc(true);
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

  const filteredPlaces = allPlaces
    .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
    .map((p) => ({ place: p, score: scorePlaceFor(p, timeSlot, location) }))
    .sort((a, b) => b.score - a.score)
    .map(({ place }) => place)
    .slice(0, 60);

  const listCategories: { value: PlaceCategory | "all"; label: string; emoji: string }[] = [
    { value: "all", label: "All", emoji: "✨" },
    ...Object.entries(PLACE_CATEGORY_CONFIG).map(([k, v]) => ({
      value: k as PlaceCategory, label: v.label, emoji: v.emoji,
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
              <button onClick={() => changeView("list")}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                <List className="h-3 w-3" /> List
              </button>
              <button onClick={() => changeView("map")}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                <Map className="h-3 w-3" /> Map
              </button>
            </div>
            <button onClick={startEditLoc}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors truncate">
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
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City *</label>
            <Input placeholder="e.g. Zurich, Rapperswil, Wetzikon" value={draftCity} onChange={(e) => setDraftCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Area / Neighbourhood (optional)</label>
            <Input placeholder="e.g. Langstrasse, Oerlikon, Seefeld" value={draftArea} onChange={(e) => setDraftArea(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">If set, the map and suggestions will centre here</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={saveLocation}>Save</Button>
            {location && <Button variant="outline" className="flex-1" onClick={() => setEditingLoc(false)}>Cancel</Button>}
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
              onSuggest={handleSuggest}
              onPinAdded={(pin) => setMapPins((prev) => [...prev, pin])}
              onViewDetails={(pin) => navigate(`/places/${pin.placeId ?? pin.id}`)}
              onRefresh={() => loadData(true, location?.lat && location?.lng
                ? bboxAround(location.lat, location.lng) : undefined)}
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
              <button key={t} onClick={() => setTimeSlot(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeSlot === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}>
                {TIME_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Category chips */}
          <div className="px-4 pt-2 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
            {listCategories.map((t) => (
              <button key={t.value} onClick={() => setCategoryFilter(t.value)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === t.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          <p className="px-4 pt-1 text-xs text-muted-foreground">
            {filteredPlaces.length} places for {TIME_LABELS[timeSlot].toLowerCase()}
            {location?.area && <> near <span className="font-medium text-foreground">{location.area}</span></>}
          </p>

          <div className="space-y-3 p-4">
            {mapLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Loading places…</p>
            ) : filteredPlaces.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No places for this filter.</p>
            ) : filteredPlaces.map((place) => {
              const cfg = PLACE_CATEGORY_CONFIG[place.category];
              const isFav = favoriteIds.includes(place.id);
              return (
                <div key={place.id}
                  className="rounded-2xl border border-border bg-card p-4 space-y-2 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => navigate(`/places/${place.id}`)}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: cfg.color + "22", color: cfg.color }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                        {place.area && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{place.area}
                          </span>
                        )}
                        {isFav && <span className="text-xs text-rose-500">❤️</span>}
                      </div>
                      <p className="font-semibold text-foreground">{place.name}</p>
                      {place.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{place.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}