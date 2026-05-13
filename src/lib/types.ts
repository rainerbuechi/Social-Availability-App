export type StatusType =
  | "free"
  | "studying"
  | "lunch"
  | "coffee"
  | "party"
  | "gym"
  | "busy";

export type LocationPrecision = "hidden" | "approximate" | "exact";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  /** Prototype-only field. Replace with Supabase Auth. */
  password?: string;
  avatarUrl?: string;
}

export interface FriendGroup {
  id: string;
  name: string;
  emoji: string;
  memberIds: string[];
}

export interface AvailabilityPost {
  id: string;
  authorId: string;
  status: StatusType;
  message?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  locationName?: string;
  locationPrecision: LocationPrecision;
  visibleToGroupId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type FriendshipStatus = "none" | "pending" | "accepted";

export interface Friendship {
  userId: string;
  status: FriendshipStatus;
}

export interface PostParticipation {
  id: string;
  postId: string;
  userId: string;
  responseMessage?: string;
  createdAt: string;
}

export interface PrivacySettings {
  defaultGroupId: string;
  defaultPrecision: LocationPrecision;
  shareReadReceipts: boolean;
  allowNotifications: boolean;
}

export interface WaitingPool {
  id: string;
  authorId: string;
  title: string;              // e.g. "Down for anything Saturday"
  description?: string;       // optional vibe note
  date: string;               // ISO date string (date only, e.g. "2025-05-10")
  startTime?: string;         // optional ISO time
  endTime?: string;           // optional ISO time
  visibleToGroupId: string;   // reuses your existing group visibility
  memberIds: string[];        // everyone who joined the pool
  chatGroupId?: string;       // set once a group chat is created from this pool
  minPeople: number;          // threshold to unlock chat (default 2)
  createdAt: string;
}

export interface PoolMembership {
  id: string;
  poolId: string;
  userId: string;
  joinedAt: string;
}

export type ActivityType = "study" | "coffee" | "lunch" | "walk" | "bar" | "event";

export interface UserLocation {
  city: string;
  area?: string;
  lat?: number;    // geocoded
  lng?: number;    // geocoded
}

export interface DiscoverCard {
  id: string;
  title: string;
  type: ActivityType;
  area: string;
  city: string;             // "any" means shows everywhere
  description: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "any";
}

export interface GroupSuggestion {
  id: string;
  groupId: string;
  fromUserId: string;
  cardTitle: string;
  cardType: ActivityType;
  cardArea: string;
  cardDescription: string;
  createdAt: string;
}

export type MapPinCategory = "place" | "suggestion" | "pool" | "post" | "meetup";

export interface MapPin {
  id: string;
  title: string;
  category: MapPinCategory;
  placeCategory?: PlaceCategory;
  source?: string; 
  description?: string;
  city: string;
  area?: string;
  address?: string;
  lat: number;
  lng: number;
  linkedEntityId?: string;   // poolId | postId | suggestionId
  linkedEntityType?: "place" | "pool" | "post" | "suggestion";
  placeId?: string;
}

/* ── Place data model ────────────────────────────────────────────────────── */

export type PlaceSource =
  | "mock"             // hardcoded dev data
  | "manual"           // user-added pin
  | "osm"              // OpenStreetMap / Overpass API
  | "zurich_open_data" // data.stadt-zuerich.ch
  | "suggestion";      // came from a Discover suggestion

export type PlaceCategory =
  | "cafe"
  | "library"
  | "park"
  | "bar"
  | "sports"
  | "restaurant"
  | "museum"
  | "viewpoint"
  | "study_spot"
  | "event_venue"
  | "public_space"
  | "other";

// Freeform social tags users apply to places
export type PlaceTag =
  | "good_for_groups"
  | "quiet_after_6pm"
  | "cheap_drinks"
  | "good_study_spot"
  | "student_friendly"
  | "outdoor_seating"
  | "open_late"
  | "great_views"
  | "laptop_friendly"
  | "good_wifi";

/**
 * Core place — raw location data only, no social layer.
 * This is what external sources (OSM, Zürich Open Data) will return once integrated.
 */
export interface Place {
  id: string;
  source: PlaceSource;
  externalId?: string;      // OSM node/way ID, open data record ID, etc.
  name: string;
  category: PlaceCategory;
  description?: string;
  city: string;
  area?: string;
  address?: string;
  lat: number;
  lng: number;
  openingHours?: string;
  website?: string;
  cuisine?: string; 
}

/**
 * DiscoverPlace — a Place enriched with social/app-layer data.
 * This is what the Discover UI renders.
 */
export interface DiscoverPlace extends Place {
  tags: PlaceTag[];
  linkedPoolIds: string[];
  linkedPostIds: string[];
  suggestedByGroupIds: string[];
  favoriteCount: number;
  commentCount: number;
}

/**
 * FavoritePlace — a user saving a place.
 */
export interface FavoritePlace {
  id: string;
  userId: string;
  placeId: string;
  savedAt: string;
}

/**
 * PlaceComment — short freeform note a user leaves on a place.
 * e.g. "ETH students go here", "quiet on weekday mornings"
 */
export interface PlaceComment {
  id: string;
  placeId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

/**
 * PlaceReview — structured rating + tags + optional text.
 */
export interface PlaceReview {
  id: string;
  placeId: string;
  authorId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  tags: PlaceTag[];
  body?: string;
  createdAt: string;
}