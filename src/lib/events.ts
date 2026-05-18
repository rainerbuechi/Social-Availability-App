import { AppEvent, EventCategory, UserLocation } from "./types";

const TM_KEY = import.meta.env.VITE_TICKETMASTER_KEY as string;
const COMMUNITY_KEY = "community_events";

// ── Helpers ───────────────────────────────────────────────────────────────

const TM_SEGMENT_MAP: Record<string, EventCategory> = {
  "KZFzniwnSyZfZ7v7nJ": "music",
  "KZFzniwnSyZfZ7v7nE": "sport",
  "KZFzniwnSyZfZ7v7na": "arts",
  "KZFzniwnSyZfZ7v7nn": "arts",
};

function tmCategory(segmentId?: string): EventCategory {
  return TM_SEGMENT_MAP[segmentId ?? ""] ?? "other";
}

function tmPrice(event: any): string | undefined {
  const range = event.priceRanges?.[0];
  if (!range) return undefined;
  const cur = range.currency ?? "CHF";
  return range.min === 0 ? "Free" : `from ${cur} ${Math.round(range.min)}`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Ticketmaster ──────────────────────────────────────────────────────────

export async function fetchTicketmasterEvents(
  location: UserLocation,
): Promise<AppEvent[]> {
  if (!TM_KEY) return [];

  const buildParams = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({
      apikey: TM_KEY,
      countryCode: "CH",
      sort: "date,asc",
      ...extra,
    });
    if (location.lat && location.lng) {
      p.set("latlong", `${location.lat},${location.lng}`);
      p.set("radius", "30");
      p.set("unit", "km");
    } else {
      p.set("city", location.city);
    }
    return p;
  };

  const fetchPage = async (
    extra: Record<string, string>,
    size: number,
  ): Promise<any[]> => {
    try {
      const params = buildParams({ size: String(size), ...extra });
      const res = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data._embedded?.events ?? [];
    } catch {
      return [];
    }
  };

  // Fetch general + sports in parallel so sports always appear
  const [general, sports] = await Promise.all([
    fetchPage({}, 30),
    fetchPage({ classificationName: "Sports" }, 20),
  ]);

  // Merge, deduplicate by TM event ID
  const seen = new Set<string>();
  const raw: any[] = [];
  for (const e of [...general, ...sports]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      raw.push(e);
    }
  }

  return raw.map((e): AppEvent => {
    const venue = e._embedded?.venues?.[0];
    const vLat  = parseFloat(venue?.location?.latitude  ?? "0");
    const vLng  = parseFloat(venue?.location?.longitude ?? "0");

    return {
      id:           `tm_${e.id}`,
      source:       "ticketmaster",
      title:        e.name,
      category:     tmCategory(e.classifications?.[0]?.segment?.id),
      venueName:    venue?.name ?? "Unknown venue",
      city:         venue?.city?.name ?? location.city,
      area:         venue?.city?.name,
      lat:          vLat || undefined,
      lng:          vLng || undefined,
      distanceKm:
        location.lat && location.lng && vLat && vLng
          ? Math.round(haversineKm(location.lat, location.lng, vLat, vLng) * 10) / 10
          : undefined,
      startDate:    e.dates?.start?.dateTime ?? e.dates?.start?.localDate ?? "",
      price:        tmPrice(e),
      imageUrl:     e.images?.find((i: any) => i.ratio === "16_9" && i.width > 200)?.url,
      ticketUrl:    e.url,
      description:  e.info,
      attractionId: e._embedded?.attractions?.[0]?.id,
    };
  });
}

// ── Community events (localStorage) ──────────────────────────────────────

function loadCommunity(): AppEvent[] {
  try {
    return JSON.parse(localStorage.getItem(COMMUNITY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCommunity(events: AppEvent[]) {
  localStorage.setItem(COMMUNITY_KEY, JSON.stringify(events));
}

export function listCommunityEvents(): AppEvent[] {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // hide events >1 day past
  return loadCommunity().filter((e) => {
    const endMs = new Date(e.endDate ?? e.startDate).getTime();
    return endMs >= cutoff;
  });
}

export function addCommunityEvent(
  input: Omit<AppEvent, "id" | "source" | "createdAt">,
  authorId: string,
): AppEvent {
  const events = loadCommunity();
  const newEvent: AppEvent = {
    ...input,
    id: `comm_${Math.random().toString(36).slice(2, 9)}`,
    source: "community",
    authorId,
    createdAt: new Date().toISOString(),
  };
  saveCommunity([newEvent, ...events]);
  return newEvent;
}

export function deleteCommunityEvent(id: string): void {
  saveCommunity(loadCommunity().filter((e) => e.id !== id));
}

export function editCommunityEvent(
  id: string,
  updates: Partial<Omit<AppEvent, "id" | "source" | "authorId" | "createdAt">>,
): void {
  saveCommunity(
    loadCommunity().map((e) => (e.id === id ? { ...e, ...updates } : e)),
  );
}
// ── Grouping (deduplication by attraction) ───────────────────────────────

export function groupEvents(events: AppEvent[]): AppEvent[][] {
  const groups = new Map<string, AppEvent[]>();
  for (const event of events) {
    const key =
      event.source === "community"
        ? event.id
        : event.attractionId
          ? `attr_${event.attractionId}`
          : `${event.title.toLowerCase()}__${event.venueName.toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return Array.from(groups.values()).map((g) =>
    g.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    ),
  );
}