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

// Session cache for all fetched places (avoids re-fetching on detail page)
const _placeCache = new Map<string, DiscoverPlace>();

// OSM API response cache — keyed by rounded bbox, expires after TTL
interface OsmCacheEntry { places: DiscoverPlace[]; fetchedAt: number }
const _osmCache = new Map<string, OsmCacheEntry>();
const OSM_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

function bboxCacheKey(bbox: [number, number, number, number]): string {
  // Round to 2 decimal places so nearby bboxes hit the same cache bucket
  return bbox.map((n) => n.toFixed(2)).join(",");
}

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
    favoriteCount: 12, commentCount: 4, isPublic: true,
  },
  {
    id: "place_2", source: "mock", name: "Volkshaus Zürich",
    category: "cafe", city: "Zurich", area: "Langstrasse",
    address: "Stauffacherstrasse 60, 8004 Zürich", lat: 47.3762, lng: 8.5288,
    description: "Relaxed café + bar with good lunch options. Popular after-class spot.",
    tags: [], linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 8, commentCount: 2, isPublic: true,
  },
  {
    id: "place_3", source: "mock", name: "Oberer Letten",
    category: "public_space", city: "Zurich", area: "Gewerbeschule",
    address: "Lettensteg, 8037 Zürich", lat: 47.3861, lng: 8.5299,
    description: "Open-air river pool on the Limmat. Legendary summer hangout for locals.",
    tags: ["outdoor_seating", "good_for_groups", "great_views"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 24, commentCount: 7, isPublic: true,
  },
  {
    id: "place_4", source: "mock", name: "Café Sphères",
    category: "cafe", city: "Zurich", area: "Langstrasse",
    address: "Hardturmstrasse 66, 8005 Zürich", lat: 47.3876, lng: 8.5221,
    description: "Bookshop-café hybrid. Quiet during mornings, buzzy evenings.",
    openingHours: "Mo-Sa 09:00-23:30",
    tags: ["good_study_spot", "laptop_friendly", "good_wifi", "open_late"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 18, commentCount: 5, isPublic: true,
  },
  {
    id: "place_5", source: "mock", name: "Lindenhügel Rapperswil",
    category: "viewpoint", city: "Rapperswil", area: "Altstadt",
    address: "Lindenhügel, 8640 Rapperswil", lat: 47.2265, lng: 8.8188,
    description: "Hilltop view over Lake Zurich. Perfect for a walk or picnic.",
    tags: ["great_views", "good_for_groups", "outdoor_seating"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 10, commentCount: 3, isPublic: true,
  },
  {
    id: "place_6", source: "mock", name: "Zürichsee Promenade Horgen",
    category: "public_space", city: "Horgen", area: "Horgen",
    address: "Seestrasse, 8810 Horgen", lat: 47.2576, lng: 8.5985,
    description: "Quiet lakeside walk away from city crowds. Ideal for afternoon strolls.",
    tags: ["outdoor_seating", "good_for_groups", "great_views"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 6, commentCount: 1, isPublic: true,
  },
  {
    id: "place_7", source: "mock", name: "Longstreet Bar",
    category: "bar", city: "Zurich", area: "Langstrasse",
    address: "Langstrasse 92, 8004 Zürich", lat: 47.3781, lng: 8.5271,
    description: "Casual bar in Langstrasse. Good for weeknight drinks, no dress code.",
    openingHours: "Mo-Su 18:00-02:00",
    tags: ["cheap_drinks", "student_friendly", "good_for_groups", "open_late"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 15, commentCount: 6, isPublic: true,
  },
  {
    id: "place_8", source: "mock", name: "Alpenquai",
    category: "public_space", city: "Zurich", area: "Enge",
    address: "Alpenquai, 8038 Zürich", lat: 47.3520, lng: 8.5370,
    description: "Quiet lake spot away from crowds. Good for a casual hangout in summer.",
    tags: ["good_for_groups", "outdoor_seating", "great_views", "quiet_after_6pm"],
    linkedPoolIds: [], linkedPostIds: [], suggestedByGroupIds: [],
    favoriteCount: 9, commentCount: 2, isPublic: true,
  },
];

// Seed detail cache with mock places
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
    isPublic: false, // OSM places are not "user-public" — they're external data
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

/**
 * Fetches places for a bounding box.
 * - OSM results are cached per-bbox for OSM_CACHE_TTL_MS
 * - Public custom/mock places always included
 * - Private custom places only included if currentUserId matches addedByUserId
 */
export async function getPlacesForBounds(
  bbox: [number, number, number, number],
  currentUserId?: string,
): Promise<DiscoverPlace[]> {
  const [south, west, north, east] = bbox;

  // ── Public custom places in bounds ──
  const publicCustomInBounds = _customPlaces.filter(
    (p) =>
      p.isPublic === true &&
      p.lat >= south && p.lat <= north &&
      p.lng >= west && p.lng <= east,
  );

  // ── Private custom places for this user ──
  const privateCustomInBounds = currentUserId
    ? _customPlaces.filter(
        (p) => !p.isPublic && p.addedByUserId === currentUserId,
      )
    : [];

    // ── Mock places in bounds ──
    const mockInBounds = mockPlaces.filter(
      (p) => p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east,
    );

  // ── OSM places (cached) ──
  const cacheKey = bboxCacheKey(bbox);
  const cached = _osmCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < OSM_CACHE_TTL_MS) {
    return [...publicCustomInBounds, ...mockInBounds, ...privateCustomInBounds, ...cached.places];
  }

  try {
    const osmRaw = await fetchPlacesFromOverpass(bbox, ACTIVE_CATEGORIES);

    let restCount = 0;
    const filtered = osmRaw.filter((p) => {
      if (p.category === "restaurant") return ++restCount <= RESTAURANT_CAP;
      return true;
    });

    const osmPlaces = filtered.map(placeToDiscoverPlace);
    osmPlaces.forEach((p) => _placeCache.set(p.id, p));

    _osmCache.set(cacheKey, { places: osmPlaces, fetchedAt: now });

    return [...publicCustomInBounds, ...mockInBounds, ...privateCustomInBounds, ...osmPlaces];
  } catch (e) {
    console.warn("Overpass failed, using mock + custom:", e);
    return [...publicCustomInBounds, ...mockInBounds, ...privateCustomInBounds];
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

export function getPublicCustomPlaces(): DiscoverPlace[] {
  return _customPlaces.filter((p) => p.isPublic === true);
}

export function addCustomPlace(
  input: Pick<DiscoverPlace, "name" | "category" | "description" | "area" | "address" | "lat" | "lng" | "city"> & {
    isPublic?: boolean;
    addedByUserId?: string;
  },
): DiscoverPlace {
  const { isPublic = false, addedByUserId, ...rest } = input;
  const place: DiscoverPlace = {
    ...rest,
    id: `custom_${Math.random().toString(36).slice(2, 9)}`,
    source: "manual",
    tags: [],
    linkedPoolIds: [],
    linkedPostIds: [],
    suggestedByGroupIds: [],
    favoriteCount: 0,
    commentCount: 0,
    isPublic,
    addedByUserId,
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
  input: Partial<Pick<DiscoverPlace, "name" | "category" | "description" | "area" | "address" | "isPublic">>,
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

// Per-bbox region cache (separate from OSM cache — includes all layers)
const _regionCache = new Map<string, DiscoverPlace[]>();

export async function loadRegion(
  forceRefresh = false,
  bbox: [number, number, number, number] = REGION_BBOX,
  currentUserId?: string,
): Promise<DiscoverPlace[]> {
  const key = bboxCacheKey(bbox);
  if (!forceRefresh && _regionCache.has(key)) return _regionCache.get(key)!;
  const places = await getPlacesForBounds(bbox, currentUserId);
  _regionCache.set(key, places);
  return places;
}

export function invalidateRegionCache(): void {
  _regionCache.clear();
  _osmCache.clear();
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

export function updateReview(
  id: string,
  authorId: string,
  patch: Partial<Pick<PlaceReview, "rating" | "body">>,
): PlaceReview | undefined {
  const idx = _reviews.findIndex((r) => r.id === id && r.authorId === authorId);
  if (idx === -1) return undefined;
  _reviews[idx] = { ..._reviews[idx], ...patch };
  save(REVIEWS_KEY, _reviews);
  return _reviews[idx];
}

export function deleteReview(id: string, authorId: string): boolean {
  const idx = _reviews.findIndex((r) => r.id === id && r.authorId === authorId);
  if (idx === -1) return false;
  _reviews.splice(idx, 1);
  save(REVIEWS_KEY, _reviews);
  return true;
}