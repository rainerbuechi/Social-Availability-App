import { AvailabilityPost, FriendGroup, PrivacySettings, User } from "./types";

export const currentUser: User = {
  id: "u_me",
  name: "You",
  username: "you",
};

export const users: User[] = [
  currentUser,
  { id: "u1", name: "Maya Patel", username: "maya" },
  { id: "u2", name: "Jordan Lee", username: "jord" },
  { id: "u3", name: "Sam Rivera", username: "samr" },
  { id: "u4", name: "Alex Chen", username: "alexc" },
  { id: "u5", name: "Riley Kim", username: "rileyk" },
  { id: "u6", name: "Taylor Brooks", username: "tbrooks" },
];

export const groups: FriendGroup[] = [
  { id: "g1", name: "Close Friends", emoji: "💛", memberIds: ["u1", "u2", "u3"] },
  { id: "g2", name: "Study Squad", emoji: "📚", memberIds: ["u2", "u4", "u5"] },
  { id: "g3", name: "Gym Crew", emoji: "💪", memberIds: ["u3", "u6"] },
  { id: "g4", name: "Everyone", emoji: "🌎", memberIds: ["u1", "u2", "u3", "u4", "u5", "u6"] },
];

const now = Date.now();
const inMin = (m: number) => new Date(now + m * 60_000).toISOString();
const agoMin = (m: number) => new Date(now - m * 60_000).toISOString();

export const posts: AvailabilityPost[] = [
  {
    id: "p1",
    authorId: "u1",
    status: "coffee",
    message: "Anyone want to grab a flat white?",
    startTime: agoMin(10),
    endTime: inMin(50),
    locationName: "Blue Bottle, Mission",
    locationPrecision: "exact",
    visibleToGroupId: "g1",
    createdAt: agoMin(10),
  },
  {
    id: "p2",
    authorId: "u2",
    status: "studying",
    message: "Library grind, come thru",
    startTime: agoMin(30),
    endTime: inMin(120),
    locationName: "Doe Library",
    locationPrecision: "approximate",
    visibleToGroupId: "g2",
    createdAt: agoMin(30),
  },
  {
    id: "p3",
    authorId: "u3",
    status: "free",
    message: "Down for whatever",
    startTime: agoMin(5),
    endTime: inMin(180),
    locationPrecision: "hidden",
    visibleToGroupId: "g4",
    createdAt: agoMin(5),
  },
  {
    id: "p4",
    authorId: "u4",
    status: "gym",
    startTime: inMin(20),
    endTime: inMin(80),
    locationName: "RSF",
    locationPrecision: "approximate",
    visibleToGroupId: "g3",
    createdAt: agoMin(2),
  },
  {
    id: "p5",
    authorId: "u5",
    status: "party",
    message: "Function at our place 🎉",
    startTime: inMin(180),
    endTime: inMin(360),
    locationName: "DM for address",
    locationPrecision: "hidden",
    visibleToGroupId: "g1",
    createdAt: agoMin(45),
  },
  {
    id: "p6",
    authorId: "u6",
    status: "lunch",
    message: "Tacos?",
    startTime: inMin(15),
    endTime: inMin(75),
    locationName: "Tacos El Patron",
    locationPrecision: "exact",
    visibleToGroupId: "g4",
    createdAt: agoMin(8),
  },
];

export const defaultPrivacy: PrivacySettings = {
  defaultGroupId: "g1",
  defaultPrecision: "approximate",
  shareReadReceipts: true,
  allowNotifications: true,
};
