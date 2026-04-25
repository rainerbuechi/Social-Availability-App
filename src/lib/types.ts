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

export interface PrivacySettings {
  defaultGroupId: string;
  defaultPrecision: LocationPrecision;
  shareReadReceipts: boolean;
  allowNotifications: boolean;
}
