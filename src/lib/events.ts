import { supabase } from "./supabaseClient";
import { AppEvent, UserLocation } from "./types";

const COMMUNITY_KEY = "community_events";

export async function fetchTicketmasterEvents(
  location: UserLocation,
  page = 0,
): Promise<AppEvent[]> {
  const { data, error } = await supabase.functions.invoke("external-events", {
    body: { location, page },
  });

  if (error) {
    console.error("external-events error", error);
    return [];
  }

  return Array.isArray(data?.events) ? data.events : [];
}

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
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

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

export function groupEvents(events: AppEvent[]): AppEvent[][] {
  const groups = new Map<string, AppEvent[]>();

  for (const event of events) {
    const safeTitle =
      typeof event.title === "string" && event.title.trim().length > 0
        ? event.title
        : "Untitled event";

    const safeVenue =
      typeof event.venueName === "string" && event.venueName.trim().length > 0
        ? event.venueName
        : "Unknown venue";

    const safeCity =
      typeof event.city === "string" && event.city.trim().length > 0
        ? event.city
        : "Unknown city";

    const safeStartDate =
      typeof event.startDate === "string" && event.startDate.trim().length > 0
        ? event.startDate
        : new Date().toISOString();

    const normalizedEvent: AppEvent = {
      ...event,
      title: safeTitle,
      venueName: safeVenue,
      city: safeCity,
      startDate: safeStartDate,
      category: event.category ?? "other",
    };

    const key =
      normalizedEvent.source === "community"
        ? normalizedEvent.id
        : normalizedEvent.attractionId
          ? `attr_${normalizedEvent.source}_${normalizedEvent.attractionId}`
          : `${normalizedEvent.source}_${safeTitle.toLowerCase()}__${safeVenue.toLowerCase()}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(normalizedEvent);
  }

  return Array.from(groups.values()).map((g) =>
    g.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    ),
  );
}