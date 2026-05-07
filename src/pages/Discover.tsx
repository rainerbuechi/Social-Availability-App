import { useEffect, useState } from "react";
import { MapPin, Sparkles, List, Map } from "lucide-react";
import { mockCards } from "@/lib/mockDiscover";
import { mockMapPins } from "@/lib/mockMapPins";
import { getUserLocation, saveUserLocation, listGroups, suggestToGroup } from "@/lib/api";
import { ActivityType, DiscoverCard, FriendGroup, MapPin as MapPinType, UserLocation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DiscoverMap from "@/components/DiscoverMap";

const ACTIVITY_TYPES: { value: ActivityType | "all"; label: string; emoji: string }[] = [
  { value: "all",    label: "All",    emoji: "✨" },
  { value: "study",  label: "Study",  emoji: "📚" },
  { value: "coffee", label: "Coffee", emoji: "☕" },
  { value: "lunch",  label: "Lunch",  emoji: "🍜" },
  { value: "walk",   label: "Walk",   emoji: "🚶" },
  { value: "bar",    label: "Drinks", emoji: "🍻" },
  { value: "event",  label: "Event",  emoji: "🎉" },
];

const TYPE_COLORS: Record<ActivityType, string> = {
  study:  "bg-blue-100 text-blue-700",
  coffee: "bg-amber-100 text-amber-700",
  lunch:  "bg-green-100 text-green-700",
  walk:   "bg-emerald-100 text-emerald-700",
  bar:    "bg-purple-100 text-purple-700",
  event:  "bg-pink-100 text-pink-700",
};

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function scoreCard(card: DiscoverCard, location: UserLocation | null): number {
  let score = 0;
  const tod = getTimeOfDay();
  if (card.timeOfDay === "any" || card.timeOfDay === tod) score += 2;
  if (location) {
    if (card.city === "any" || card.city.toLowerCase() === location.city.toLowerCase()) score += 1;
    if (location.area && (card.area === "any" || card.area.toLowerCase() === location.area.toLowerCase())) score += 3;
    if (location.campus && card.area.toLowerCase().includes("university")) score += 2;
  }
  return score;
}

export default function Discover() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [editingLoc, setEditingLoc] = useState(false);
  const [draftCity, setDraftCity] = useState("");
  const [draftArea, setDraftArea] = useState("");
  const [draftCampus, setDraftCampus] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    getUserLocation().then((loc) => {
      setLocation(loc);
      if (!loc) setEditingLoc(true);
    });
    listGroups().then((gs) => {
      setGroups(gs);
      if (gs.length > 0) setSelectedGroup(gs[0].id);
    });
  }, []);

  const saveLocation = async () => {
    if (!draftCity.trim()) { toast.error("City is required"); return; }
    const loc: UserLocation = {
      city: draftCity.trim(),
      area: draftArea.trim() || undefined,
      campus: draftCampus.trim() || undefined,
    };
    await saveUserLocation(loc);
    setLocation(loc);
    setEditingLoc(false);
    toast.success("Location saved");
  };

  const startEditLoc = () => {
    setDraftCity(location?.city ?? "");
    setDraftArea(location?.area ?? "");
    setDraftCampus(location?.campus ?? "");
    setEditingLoc(true);
  };

  const handleSuggest = async (card: DiscoverCard) => {
    if (!selectedGroup) { toast.error("No group selected"); return; }
    await suggestToGroup(selectedGroup, {
      title: card.title,
      type: card.type,
      area: card.area,
      description: card.description,
    });
    const group = groups.find((g) => g.id === selectedGroup);
    toast.success(`Suggested to ${group?.name ?? "group"} 🎉`);
    setSuggestingFor(null);
  };

  const filtered = mockCards
    .filter((c) => typeFilter === "all" || c.type === typeFilter)
    .map((c) => ({ card: c, score: scoreCard(c, location) }))
    .sort((a, b) => b.score - a.score)
    .map(({ card }) => card);

  return (
    <div>
      {/* Header */}
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight shrink-0">
            Discover<span className="text-primary"> ✨</span>
          </h1>
          <div className="flex items-center gap-2 min-w-0">
            {/* View toggle */}
            <div className="flex rounded-full border border-border bg-card p-0.5 shrink-0">
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <List className="h-3 w-3" /> List
              </button>
              <button
                onClick={() => setView("map")}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Map className="h-3 w-3" /> Map
              </button>
            </div>
            {/* Location button */}
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
          Things to do, ranked for right now
        </p>
      </header>

      {/* Location settings form */}
      {editingLoc && (
        <div className="m-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Where are you based?</p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City *</label>
            <Input placeholder="e.g. Zurich, Rapperswil, Bern" value={draftCity} onChange={(e) => setDraftCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Area / Neighbourhood (optional)</label>
            <Input placeholder="e.g. Altstadt, Seepromenade, City Center" value={draftArea} onChange={(e) => setDraftArea(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">University / Campus (optional)</label>
            <Input placeholder="e.g. HSG, ETH Zürich, EPFL" value={draftCampus} onChange={(e) => setDraftCampus(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={saveLocation}>Save</Button>
            {location && (
              <Button variant="outline" className="flex-1" onClick={() => setEditingLoc(false)}>Cancel</Button>
            )}
          </div>
        </div>
      )}

      {/* Map view */}
      {view === "map" && (
        <div className="px-4 pt-3 pb-4">
          <DiscoverMap
            pins={mockMapPins}
            centerLat={47.3769}
            centerLng={8.5417}
            onSuggestToGroup={(pin: MapPinType) => {
              if (groups.length === 0) { toast.error("No groups yet"); return; }
              setSuggestingFor(pin.id);
            }}
          />
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <>
          {/* Type filter chips */}
          <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === t.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Time of day label */}
          <p className="px-4 pt-2 text-xs text-muted-foreground">
            Showing best picks for <span className="font-medium text-foreground">{getTimeOfDay()}</span>
            {location && <> near <span className="font-medium text-foreground">{location.area ?? location.city}</span></>}
          </p>

          {/* Cards */}
          <div className="space-y-3 p-4">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No suggestions for this filter.</div>
            ) : (
              filtered.map((card) => (
                <div key={card.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[card.type]}`}>
                          {ACTIVITY_TYPES.find((t) => t.value === card.type)?.emoji} {card.type}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {card.area === "any" ? (location?.area ?? "Your area") : card.area}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground">{card.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                    </div>
                  </div>

                  {suggestingFor === card.id ? (
                    <div className="space-y-2">
                      <select
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.emoji} {g.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => handleSuggest(card)}>
                          <Sparkles className="h-3.5 w-3.5 mr-1" /> Send suggestion
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSuggestingFor(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setSuggestingFor(card.id)}>
                      Suggest to group
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}