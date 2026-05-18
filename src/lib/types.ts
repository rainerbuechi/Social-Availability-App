/* ── Status / Post types ─────────────────────────── */

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
  endTime: string;   // ISO
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
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  visibleToGroupId: string;
  memberIds: string[];
  chatGroupId?: string;
  minPeople: number;
  createdAt: string;
}

export interface PoolMembership {
  id: string;
  poolId: string;
  userId: string;
  joinedAt: string;
}

/* ── Activity / Discover types ───────────────────── */

export type ActivityType = "study" | "coffee" | "lunch" | "walk" | "bar" | "event";

export interface UserLocation {
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
}

export interface DiscoverCard {
  id: string;
  title: string;
  type: ActivityType;
  area: string;
  city: string;
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
  votes?: Record<string, "up" | "down">; // userId → vote
}

/* ── Map pin types ──────────────────────────────── */

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
  linkedEntityId?: string;
  linkedEntityType?: "place" | "pool" | "post" | "suggestion";
  placeId?: string;
}

/* ── Place data model ────────────────────────────── */

export type PlaceSource =
  | "mock"
  | "manual"
  | "osm"
  | "zurich_open_data"
  | "suggestion";

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

export interface Place {
  id: string;
  source: PlaceSource;
  externalId?: string;
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

export interface DiscoverPlace extends Place {
  tags: PlaceTag[];
  linkedPoolIds: string[];
  linkedPostIds: string[];
  suggestedByGroupIds: string[];
  favoriteCount: number;
  commentCount: number;
  /**
   * true  → visible on public Discover feed + map for everyone.
   * false → private; only the creator can see/use it.
   * undefined → treated as private for safety.
   */
  isPublic?: boolean;
  /** Creator's user id — for attribution and private-visibility checks. */
  addedByUserId?: string;
}

export interface FavoritePlace {
  id: string;
  userId: string;
  placeId: string;
  savedAt: string;
}

export interface PlaceComment {
  id: string;
  placeId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface PlaceReview {
  id: string;
  placeId: string;
  authorId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  tags: PlaceTag[];
  body?: string;
  createdAt: string;
}


// ── Events ────────────────────────────────────────────────────────────────

export type EventSource = "ticketmaster" | "eventfrog" | "community";

export type EventCategory = "music" | "arts" | "sport" | "party" | "community" | "other";

export interface AppEvent {
  id: string;
  source: EventSource;
  title: string;
  category: EventCategory;
  venueName: string;
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  startDate: string;      // ISO string
  price?: string;         // "CHF 25" | "Free"
  imageUrl?: string;
  ticketUrl?: string;
  description?: string;
  attractionId?: string;   // used to group duplicate TM dates
  endDate?: string;        // for multi-day events
  authorId?: string;      // community events only
  createdAt?: string;
}