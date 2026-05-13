import {
  DiscoverPlace, MapPin, MapPinCategory,
  Place, PlaceCategory, FavoritePlace, PlaceComment, PlaceReview,
} from "./types";
import { fetchPlacesFromOverpass } from "./overpass";

/* ── Constants ───────────────────────────────────── */

const ACTIVE_CATEGORIES: PlaceCategory[] = [
  "cafe", "bar", "restaurant", "library",
  "park", "museum", "viewpoint", "public_space", "sports",
];

const RESTAURANT_CAP = 25;

const CATEGORY_TO_PIN: Record<PlaceCategory, MapPinCategory> = {
  cafe: "place", bar: "place", restaurant: "place", library: "place",
  park: "place", museum: "place", viewpoint: "place", study_spot: "place",
  event_venue: "place", public_space: "place", sports: "place", other: "place",
};

const CUSTOM_PLACES_KEY = "custom_places";
const FAVORITES_KEY     = "place_favorites";
const COMMENTS_KEY      = "place_comments";
const REVIEWS_KEY       = "place_reviews";

/* ── localStorage helpers ────────────────────────── */

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ── In-memory state ─────────────────────────────── */

let _customPlaces: DiscoverPlace[] = load<DiscoverPlace[]>(CUSTOM_PLACES_KEY, []);
let _favorites: FavoritePlace[]    = load<FavoritePlace[]>(FAVORITES_KEY, []);
let _comments: PlaceComment[]      = load<PlaceComment[]>(COMMENTS_KEY, []);
let _reviews: PlaceReview[]        = load<PlaceReview[]>(REVIEWS_KEY, []);

// Session cache for OSM places (avoids re-fetching on detail page)
const _placeCache = new Map<string, DiscoverPlace>();

/* ── Mock/curated places ─────────────────────────── */

export const mockPlaces: DiscoverPlace[] = [
  {
    id: "place_1", source: "mock", name: "ETH Main Library",
    category: "library", city: "Zurich", area: "Zentrum",
    address: "Rämistrasse 101, 8092 Zürich", lat: 47.3763, lng: 8.5480,
    description: "Great silent study floors, solid wifi, open late on weekdays.",
    openingHours: "Mo-Fr 08:00-22:00, Sa 10:00-18:00",
    tags: ["good_study_spot", "laptop_friendly", "good_wifi", "open_late"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 0, commentCount: 0,
  },
  {
    id: "place_2", source: "mock", name: "Volkshaus Zürich",
    category: "cafe", city: "Zurich", area: "Langstrasse",
    address: "Stauffacherstrasse 60, 8004 Zürich", lat: 47.3762, lng: 8.5288,
    description: "Relaxed café + bar with good lunch options. Popular after-class spot.",
    tags: ["good_for_groups", "student_friendly", "outdoor_seating"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 0, commentCount: 0,
  },
  {
    id: "place_3", source: "mock", name: "Lindenhügel",
    category: "viewpoint", city: "Zurich", area: "Altstadt",
    address: "Lindenhügel, 8001 Zürich", lat: 47.3728, lng: 8.5411,
    description: "Classic Zurich meetup hill. Easy for everyone to find, great views.",
    tags: ["good_for_groups", "great_views"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 0, commentCount: 0,
  },
  {
    id: "place_4", source: "mock", name: "Bürkliplatz",
    category: "public_space", city: "Zurich", area: "City Center",
    address: "Bürkliplatz, 8001 Zürich", lat: 47.3659, lng: 8.5432,
    description: "Central lakeside square. Good start for walks or market days.",
    tags: ["good_for_groups", "outdoor_seating", "great_views"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 0, commentCount: 0,
  },
  {
    id: "place_5", source: "mock", name: "Café Sprüngli",
    category: "cafe", city: "Zurich", area: "Paradeplatz",
    address: "Bahnhofstrasse 21, 8001 Zürich", lat: 47.3693, lng: 8.5387,
    description: "Iconic Zurich café. Good for a coffee catch-up, busy on weekends.",
    website: "https://www.spruengli.ch",
    tags: ["student_friendly", "laptop_friendly"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 0, commentCount: 0,
  },
  {
    id: "place_6", source: "mock", name: "Zürichsee Promenade",
    category: "park", city: "Zurich", area: "Seefeld",
    address: "Utoquai, 8008 Zürich", lat: 47.3579, lng: 8.5490,
    description: "Flat lakeside walk, great any time of day.",
    tags: ["outdoor_seating", "good_for_groups", "great_views"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 0, commentCount: 0,
  },
  {
    id: "place_7", source: "mock", name: "Longstreet Bar",
    category: "bar", city: "Zurich", area: "Langstrasse",
    address: "Langstrasse 92, 8004 Zürich", lat: 47.3781, lng: 8.5271,
    description: "Casual bar in Langstrasse. Good for weeknight drinks, no dress code.",
    openingHours: "Mo-Su 18:00-02:00",
    tags: ["cheap_drinks", "student_friendly", "good_for_groups", "open_late"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 0, commentCount: 0,
  },
  {
    id: "place_8", source: "mock", name: "Alpenquai",
    category: "public_space", city: "Zurich", area: "Enge",
    address: "Alpenquai, 8038 Zürich", lat: 47.3520, lng: 8.5370,
    description: "Quiet lake spot away from crowds. Good for a casual hangout in summer.",
    tags: ["good_for_groups", "outdoor_seating", "great_views", "quiet_after_6pm"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 0, commentCount: 0,
  },
];

// Seed cache with mock places
mockPlaces.forEach((p) => _placeCache.set(p.id, p));

/* ── Converters ──────────────────────────────────── */

function placeToDiscoverPlace(place: Place): DiscoverPlace {
  return {
    ...place,
    tags: [],
    linkedPoolIds: [],
    linkedPostIds: [],
    suggestedByGroupIds: [],
    favoriteCount: 0,
    commentCount: 0,
  };
}

export function placeToMapPin(place: DiscoverPlace): MapPin {
  return {
    id: place.id,
    title: place.name,
    category: CATEGORY_TO_PIN[place.category],
    placeCategory: place.category,
    source: place.source,
    description: place.description,
    city: place.city,
    area: place.area,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    linkedEntityId: place.id,
    linkedEntityType: "place",
    placeId: place.id,
  };
}

/* ── Data fetching ───────────────────────────────── */

export async function getPlacesForBounds(
  bbox: [number, number, number, number],
): Promise<DiscoverPlace[]> {
  try {
    const osmRaw = await fetchPlacesFromOverpass(bbox, ACTIVE_CATEGORIES);

    // Cap restaurants, unlimited for others
    let restCount = 0;
    const filtered = osmRaw.filter((p) => {
      if (p.category === "restaurant") return ++restCount <= RESTAURANT_CAP;
      return true;
    });

    const osmPlaces = filtered.map(placeToDiscoverPlace);
    osmPlaces.forEach((p) => _placeCache.set(p.id, p));

    // Custom places within bbox
    const [south, west, north, east] = bbox;
    const customInBounds = _customPlaces.filter(
      (p) => p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east,
    );

    return [...mockPlaces, ...customInBounds, ...osmPlaces];
  } catch (e) {
    console.warn("Overpass failed, using mock + custom:", e);
    return [...mockPlaces, ..._customPlaces];
  }
}

export async function getPlace(id: string): Promise<DiscoverPlace | undefined> {
  if (_placeCache.has(id)) return _placeCache.get(id);
  const mock = mockPlaces.find((p) => p.id === id);
  if (mock) return mock;
  return _customPlaces.find((p) => p.id === id);
}

/* ── Custom places ───────────────────────────────── */

export function getAllCustomPlaces(): DiscoverPlace[] {
  return [..._customPlaces];
}

export function addCustomPlace(
  input: Pick<DiscoverPlace, "name" | "category" | "description" | "area" | "address" | "lat" | "lng" | "city">,
): DiscoverPlace {
  const place: DiscoverPlace = {
    ...input,
    id: `custom_${Math.random().toString(36).slice(2, 9)}`,
    source: "manual",
    tags: [],
    linkedPoolIds: [],
    linkedPostIds: [],
    suggestedByGroupIds: [],
    favoriteCount: 0,
    commentCount: 0,
  };
  _customPlaces = [place, ..._customPlaces];
  save(CUSTOM_PLACES_KEY, _customPlaces);
  _placeCache.set(place.id, place);
  return place;
}

export function deleteCustomPlace(id: string): boolean {
  const idx = _customPlaces.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  _customPlaces.splice(idx, 1);
  save(CUSTOM_PLACES_KEY, _customPlaces);
  _placeCache.delete(id);
  return true;
}

export function updateCustomPlace(
  id: string,
  input: Partial<Pick<DiscoverPlace, "name" | "category" | "description" | "area" | "address">>,
): DiscoverPlace | undefined {
  const idx = _customPlaces.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  _customPlaces[idx] = { ..._customPlaces[idx], ...input };
  save(CUSTOM_PLACES_KEY, _customPlaces);
  _placeCache.set(id, _customPlaces[idx]);
  return _customPlaces[idx];
}

/* ── Region cache ────────────────────────────────── */

// Zurich → Rapperswil full region
const REGION_BBOX: [number, number, number, number] = [47.18, 8.44, 47.44, 8.88];

let _regionCache: DiscoverPlace[] | null = null;

export async function loadRegion(
  forceRefresh = false,
  bbox: [number, number, number, number] = REGION_BBOX,
): Promise<DiscoverPlace[]> {
  if (_regionCache && !forceRefresh) return _regionCache;
  const places = await getPlacesForBounds(bbox);
  _regionCache = places;
  return places;
}

export function invalidateRegionCache(): void {
  _regionCache = null;
}

/* ── Social layer ────────────────────────────────── */

export function getFavorites(userId: string): FavoritePlace[] {
  return _favorites.filter((f) => f.userId === userId);
}

export function isFavorite(userId: string, placeId: string): boolean {
  return _favorites.some((f) => f.userId === userId && f.placeId === placeId);
}

export function toggleFavorite(userId: string, placeId: string): boolean {
  const idx = _favorites.findIndex((f) => f.userId === userId && f.placeId === placeId);
  if (idx !== -1) {
    _favorites.splice(idx, 1);
    save(FAVORITES_KEY, _favorites);
    return false;
  }
  _favorites.push({
    id: `fav_${Math.random().toString(36).slice(2, 9)}`,
    userId, placeId, savedAt: new Date().toISOString(),
  });
  save(FAVORITES_KEY, _favorites);
  return true;
}

export function getComments(placeId: string): PlaceComment[] {
  return _comments.filter((c) => c.placeId === placeId);
}

export function addComment(placeId: string, authorId: string, body: string): PlaceComment {
  const comment: PlaceComment = {
    id: `cmt_${Math.random().toString(36).slice(2, 9)}`,
    placeId, authorId, body, createdAt: new Date().toISOString(),
  };
  _comments = [comment, ..._comments];
  save(COMMENTS_KEY, _comments);
  return comment;
}

export function getReviews(placeId: string): PlaceReview[] {
  return _reviews.filter((r) => r.placeId === placeId);
}

export function addReview(
  placeId: string, authorId: string,
  rating: PlaceReview["rating"], tags: PlaceReview["tags"], body?: string,
): PlaceReview {
  const review: PlaceReview = {
    id: `rev_${Math.random().toString(36).slice(2, 9)}`,
    placeId, authorId, rating, tags, body,
    createdAt: new Date().toISOString(),
  };
  _reviews = [review, ..._reviews];
  save(REVIEWS_KEY, _reviews);
  return review;
}