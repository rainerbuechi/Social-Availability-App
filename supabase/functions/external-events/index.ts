type EventCategory =
  | "music"
  | "arts"
  | "sport"
  | "party"
  | "food"
  | "wellness"
  | "education"
  | "outdoor"
  | "community"
  | "other";

type UserLocation = {
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
};

type AppEvent = {
  id: string;
  source: "ticketmaster" | "eventfrog";
  title: string;
  category: EventCategory;
  venueName: string;
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  startDate: string;
  price?: string;
  imageUrl?: string;
  ticketUrl?: string;
  description?: string;
  attractionId?: string;
  endDate?: string;
};

const EVENT_RADIUS_KM = 30;
const EVENTFROG_PAGE_SIZE = 30;
const EVENTFROG_INITIAL_SCAN_PAGES = 15;
const EVENTFROG_LOAD_MORE_SCAN_PAGES = 5;
const EVENTFROG_INITIAL_TARGET_COUNT = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TM_SEGMENT_MAP: Record<string, EventCategory> = {
  KZFzniwnSyZfZ7v7nJ: "music",
  KZFzniwnSyZfZ7v7nE: "sport",
  KZFzniwnSyZfZ7v7na: "arts",
  KZFzniwnSyZfZ7v7nn: "arts",
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

function safeString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    const preferred =
      record.de ??
      record.en ??
      record.fr ??
      record.it ??
      Object.values(record).find(
        (item) => typeof item === "string" && item.trim().length > 0,
      );

    if (typeof preferred === "string" && preferred.trim().length > 0) {
      return preferred.trim();
    }
  }

  return fallback;
}

function safeNumber(value: unknown): number | undefined {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue !== 0
    ? numberValue
    : undefined;
}

function firstDefined<T>(...values: T[]): T | undefined {
  return values.find((value) => value !== undefined && value !== null);
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
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

function isFutureEvent(startDate: string): boolean {
  const startMs = new Date(startDate).getTime();

  if (!Number.isFinite(startMs)) return false;

  return startMs >= Date.now();
}

async function fetchTicketmasterEvents(
  location: UserLocation,
  page: number,
): Promise<AppEvent[]> {
  const key = Deno.env.get("TICKETMASTER_KEY");
  if (!key) return [];

  const buildParams = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({
      apikey: key,
      countryCode: "CH",
      sort: "date,asc",
      ...extra,
    });

    if (location.lat && location.lng) {
      p.set("latlong", `${location.lat},${location.lng}`);
      p.set("radius", String(EVENT_RADIUS_KM));
      p.set("unit", "km");
    } else if (location.city) {
      p.set("city", location.city);
    }

    return p;
  };

  const fetchPage = async (
    extra: Record<string, string>,
    size: number,
  ): Promise<any[]> => {
    try {
      const params = buildParams({
        size: String(size),
        page: String(page),
        ...extra,
      });

      const res = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
      );

      if (!res.ok) {
        console.error("Ticketmaster error", res.status, await res.text());
        return [];
      }

      const data = await res.json();
      return data._embedded?.events ?? [];
    } catch (err) {
      console.error("Ticketmaster fetch failed", err);
      return [];
    }
  };

  const [general, music, arts, sports] = await Promise.all([
    fetchPage({}, 30),
    fetchPage({ classificationName: "Music" }, 30),
    fetchPage({ classificationName: "Arts & Theatre" }, 30),
    fetchPage({ classificationName: "Sports" }, 30),
  ]);

  const seen = new Set<string>();
  const raw: any[] = [];

  for (const e of [...general, ...music, ...arts, ...sports]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      raw.push(e);
    }
  }

  return raw
    .map((e): AppEvent => {
      const venue = e._embedded?.venues?.[0];
      const vLat = safeNumber(venue?.location?.latitude);
      const vLng = safeNumber(venue?.location?.longitude);

      return {
        id: `tm_${e.id}`,
        source: "ticketmaster",
        title: safeString(e.name, "Untitled event"),
        category: tmCategory(e.classifications?.[0]?.segment?.id),
        venueName: safeString(venue?.name, "Unknown venue"),
        city: safeString(venue?.city?.name, location.city),
        area: safeString(venue?.city?.name, location.area ?? location.city),
        lat: vLat,
        lng: vLng,
        distanceKm:
          location.lat && location.lng && vLat && vLng
            ? Math.round(haversineKm(location.lat, location.lng, vLat, vLng) * 10) /
              10
            : undefined,
        startDate: safeString(
          e.dates?.start?.dateTime ?? e.dates?.start?.localDate,
          "",
        ),
        price: tmPrice(e),
        imageUrl: e.images?.find((i: any) => i.ratio === "16_9" && i.width > 200)
          ?.url,
        ticketUrl: e.url,
        description: e.info ?? e.pleaseNote,
        attractionId: e._embedded?.attractions?.[0]?.id,
      };
    })
    .filter((event) => Boolean(event.startDate))
    .filter((event) => isFutureEvent(event.startDate));
}

async function fetchEventfrogRawPage(
  key: string,
  location: UserLocation,
  eventfrogPage: number,
): Promise<any[]> {
  const params = new URLSearchParams({
    perPage: String(EVENTFROG_PAGE_SIZE),
    page: String(eventfrogPage),
  });

  if (location.lat && location.lng) {
    params.set("lat", String(location.lat));
    params.set("lng", String(location.lng));

    // Eventfrog uses "r" for radius in km.
    params.set("r", String(EVENT_RADIUS_KM));
  } else if (location.city) {
    params.set("city", location.city);
  }

  const url = `https://api.eventfrog.net/api/v1/events?${params}`;

  console.log("Eventfrog request url:", url);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error("Eventfrog error", res.status, await res.text());
      return [];
    }

    const data = await res.json();

    const rawEventsCandidate =
      data.events ??
      data.datasets ??
      data.items ??
      data.data ??
      data.results ??
      data.result ??
      [];

    const rawEvents = Array.isArray(rawEventsCandidate)
      ? rawEventsCandidate
      : [];

    console.log(
      `Eventfrog rawEvents count page ${eventfrogPage}:`,
      rawEvents.length,
    );

    return rawEvents;
  } catch (err) {
    console.error("Eventfrog fetch failed", err);
    return [];
  }
}

function mapEventfrogEvent(e: any, location: UserLocation): AppEvent | null {
  const venue =
    e.location ??
    e.venue ??
    e.place ??
    e.address ??
    e.eventLocation ??
    e.event_location ??
    {};

  const start =
    e.begin ??
    e.startDate ??
    e.start_date ??
    e.start ??
    e.startsAt ??
    e.starts_at ??
    e.beginDate ??
    e.date ??
    e.openingDate ??
    e.opening_date ??
    "";

  const startDate = safeString(start, "");
  if (!startDate) return null;

  if (!isFutureEvent(startDate)) return null;

  const title =
    e.title ??
    e.name ??
    e.eventName ??
    e.event_name ??
    e.designation ??
    e.summary ??
    e.description;

  const venueName =
    venue.name ??
    venue.title ??
    venue.designation ??
    e.locationName ??
    e.location_name ??
    e.venueName ??
    e.venue_name ??
    e.location?.name ??
    e.location?.title;

  const city =
    venue.city ??
    venue.town ??
    venue.address?.city ??
    e.city ??
    e.town ??
    e.locationCity ??
    e.location_city ??
    location.city;

  const lat =
    safeNumber(venue.latitude) ??
    safeNumber(venue.lat) ??
    safeNumber(venue.geo?.lat) ??
    safeNumber(venue.coordinates?.lat) ??
    safeNumber(e.latitude) ??
    safeNumber(e.lat);

  const lng =
    safeNumber(venue.longitude) ??
    safeNumber(venue.lng) ??
    safeNumber(venue.lon) ??
    safeNumber(venue.geo?.lng) ??
    safeNumber(venue.geo?.lon) ??
    safeNumber(venue.coordinates?.lng) ??
    safeNumber(e.longitude) ??
    safeNumber(e.lng) ??
    safeNumber(e.lon);

  let distanceKm: number | undefined;

  if (location.lat && location.lng && lat && lng) {
    distanceKm =
      Math.round(haversineKm(location.lat, location.lng, lat, lng) * 10) / 10;

    if (distanceKm > EVENT_RADIUS_KM) {
      return null;
    }
  }

  const groupId =
    e.groupId ??
    e.group_id ??
    e.eventGroupId ??
    e.event_group_id ??
    e.group?.id;

  const imageUrl = firstDefined(
    e.emblemToShow?.url,
    e.imageUrl,
    e.image_url,
    e.image?.url,
    e.teaserImage?.url,
    e.teaser_image?.url,
    e.picture?.url,
    e.pictures?.[0]?.url,
    e.images?.[0]?.url,
    e.media?.[0]?.url,
  );

  const ticketUrl = firstDefined(
    e.url,
    e.webUrl,
    e.web_url,
    e.ticketUrl,
    e.ticket_url,
    e.bookingUrl,
    e.booking_url,
    e.permalink,
    e.links?.self,
    e.links?.web,
    e.presaleLink,
  );

  return {
    id: `ef_${e.id ?? e.eventId ?? e.event_id ?? crypto.randomUUID()}`,
    source: "eventfrog",
    title: safeString(title, "Untitled event"),
    category: mapEventfrogCategory(e),
    venueName: safeString(
      venueName ?? e.organizerName ?? e.locationAlias,
      "Unknown venue",
    ),
    city: safeString(city, location.city),
    area: safeString(city, location.area ?? location.city),
    lat,
    lng,
    distanceKm,
    startDate,
    endDate: undefined,
    price:
      typeof e.priceText === "string"
        ? e.priceText
        : typeof e.price === "string"
          ? e.price
          : undefined,
    imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
    ticketUrl: typeof ticketUrl === "string" ? ticketUrl : undefined,
    description: safeString(
      e.shortDescription ??
        e.short_description ??
        e.description ??
        e.descriptionAsHTML ??
        e.summary ??
        e.subtitle,
      "",
    ),
    attractionId: groupId ? String(groupId) : undefined,
  };
}

async function fetchEventfrogEvents(
  location: UserLocation,
  page: number,
): Promise<AppEvent[]> {
  const key = Deno.env.get("EVENTFROG_KEY");
  if (!key) return [];

  const pagesToScan =
    page === 0 ? EVENTFROG_INITIAL_SCAN_PAGES : EVENTFROG_LOAD_MORE_SCAN_PAGES;

  const startPage =
    page === 0
      ? 1
      : EVENTFROG_INITIAL_SCAN_PAGES +
        (page - 1) * EVENTFROG_LOAD_MORE_SCAN_PAGES +
        1;

  const pages = Array.from(
    { length: pagesToScan },
    (_, index) => startPage + index,
  );

  // Important: Eventfrog pages are fetched in parallel.
  const rawPages = await Promise.all(
    pages.map((eventfrogPage) =>
      fetchEventfrogRawPage(key, location, eventfrogPage),
    ),
  );

  const rawEvents = rawPages.flat();

  const seen = new Set<string>();
  const mapped: AppEvent[] = [];

  for (const rawEvent of rawEvents) {
    const id = String(rawEvent.id ?? rawEvent.eventId ?? rawEvent.event_id ?? "");

    if (id && seen.has(id)) continue;
    if (id) seen.add(id);

    const event = mapEventfrogEvent(rawEvent, location);
    if (event) mapped.push(event);
  }

  const sorted = mapped.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  const result =
    page === 0 ? sorted.slice(0, EVENTFROG_INITIAL_TARGET_COUNT) : sorted;

  console.log("Eventfrog mapped count:", result.length);

  return result;
}

function mapEventfrogCategory(e: any): EventCategory {
  const rubricId = Number(e.rubricId ?? e.rubric_id);

  if ([90, 909].includes(rubricId)) return "arts";
  if ([43].includes(rubricId)) return "wellness";
  if ([96].includes(rubricId)) return "education";
  if ([901].includes(rubricId)) return "food";
  if ([4].includes(rubricId)) return "outdoor";
  if ([5].includes(rubricId)) return "other";

  const raw = safeString(
    e.category ??
      e.rubric ??
      e.type ??
      e.genre ??
      e.rubricName ??
      e.title ??
      e.description ??
      "",
    "",
  ).toLowerCase();

  if (
    raw.includes("concert") ||
    raw.includes("music") ||
    raw.includes("musik") ||
    raw.includes("konzert") ||
    raw.includes("sound")
  ) {
    return "music";
  }

  if (
    raw.includes("sport") ||
    raw.includes("fitness") ||
    raw.includes("swimming") ||
    raw.includes("schwimmen")
  ) {
    return "sport";
  }

  if (
    raw.includes("party") ||
    raw.includes("club") ||
    raw.includes("nightlife") ||
    raw.includes("bar")
  ) {
    return "party";
  }

  if (
    raw.includes("art") ||
    raw.includes("kunst") ||
    raw.includes("museum") ||
    raw.includes("ausstellung") ||
    raw.includes("theatre") ||
    raw.includes("theater")
  ) {
    return "arts";
  }

  if (
    raw.includes("brunch") ||
    raw.includes("food") ||
    raw.includes("essen") ||
    raw.includes("dinner") ||
    raw.includes("restaurant")
  ) {
    return "food";
  }

  if (
    raw.includes("meditation") ||
    raw.includes("yoga") ||
    raw.includes("wellness") ||
    raw.includes("sound bath")
  ) {
    return "wellness";
  }

  if (
    raw.includes("kurs") ||
    raw.includes("course") ||
    raw.includes("seminar") ||
    raw.includes("workshop") ||
    raw.includes("fachwirt")
  ) {
    return "education";
  }

  if (
    raw.includes("ausflug") ||
    raw.includes("fahrt") ||
    raw.includes("tour") ||
    raw.includes("outdoor") ||
    raw.includes("wanderung")
  ) {
    return "outdoor";
  }

  return "other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const location = body.location as UserLocation | null;
    const page = typeof body.page === "number" ? body.page : 0;

    if (!location) {
      return new Response(JSON.stringify({ events: [], hasMore: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [ticketmaster, eventfrog] = await Promise.all([
      fetchTicketmasterEvents(location, page),
      fetchEventfrogEvents(location, page),
    ]);

    console.log("Ticketmaster mapped count:", ticketmaster.length);
    console.log("External events page:", page);

    const events = [...ticketmaster, ...eventfrog].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    return new Response(
      JSON.stringify({
        events,
        hasMore: events.length > 0,
        page,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("external-events failed", err);

    return new Response(JSON.stringify({ events: [], hasMore: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});