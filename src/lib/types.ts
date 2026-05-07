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
  campus?: string;
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

export type MapPinCategory = "suggestion" | "pool" | "post" | "meetup";

export interface MapPin {
  id: string;
  title: string;
  category: MapPinCategory;
  description?: string;
  city: string;
  area?: string;
  address?: string;
  lat: number;
  lng: number;
  linkedEntityId?: string;   // poolId | postId | suggestionId
  linkedEntityType?: "pool" | "post" | "suggestion";
}