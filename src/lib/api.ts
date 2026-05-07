/**
 * Data access layer.
 * Currently backed by in-memory mocks + localStorage.
 * ⚠️ PROTOTYPE ONLY — no real security. Replace with Supabase Auth + DB later.
 */
import {
  AvailabilityPost,
  ChatMessage,
  Friendship,
  FriendGroup,
  FriendshipStatus,
  PostParticipation,
  PrivacySettings,
  User,
} from "./types";
import {
  currentUser as mockMe,
  defaultPrivacy,
  groups as mockGroups,
  posts as mockPosts,
  users as mockUsers,
} from "./mockData";

/* ── Storage helpers ─────────────────────────────── */

const POSTS_KEY = "availability_posts";
const GROUPS_KEY = "friend_groups";
const CHAT_KEY = "chat_messages";
const FRIENDS_KEY = "friendships";
const USERS_KEY = "local_users";
const AUTH_KEY = "current_user_id";
const PARTICIPANTS_KEY = "post_participants";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) || typeof parsed === "object") return parsed as T;
    }
  } catch {}
  return fallback;
}

function saveJson(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

/* ── In-memory state ─────────────────────────────── */

let _users: User[] = loadJson<User[]>(USERS_KEY, [...mockUsers]);
let _posts: AvailabilityPost[] = loadJson<AvailabilityPost[]>(POSTS_KEY, [...mockPosts]);
let _groups: FriendGroup[] = loadJson<FriendGroup[]>(GROUPS_KEY, [...mockGroups]);
let _chats: ChatMessage[] = loadJson<ChatMessage[]>(CHAT_KEY, []);
let _friends: Friendship[] = loadJson<Friendship[]>(FRIENDS_KEY, [
  { userId: "u1", status: "accepted" },
  { userId: "u2", status: "accepted" },
  { userId: "u3", status: "accepted" },
  { userId: "u4", status: "accepted" },
  { userId: "u5", status: "accepted" },
  { userId: "u6", status: "accepted" },
]);
let _privacy: PrivacySettings = { ...defaultPrivacy };

/* ── Auth (prototype-only — replace with Supabase Auth) ── */

function _getLoggedInId(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

function _getMe(): User | null {
  const id = _getLoggedInId();
  if (!id) return null;
  return _users.find((u) => u.id === id) ?? null;
}

/** Returns null if not logged in */
export async function getCurrentUser(): Promise<User | null> {
  return _getMe();
}

/** Check if a user session exists */
export async function isLoggedIn(): Promise<boolean> {
  return _getLoggedInId() !== null;
}

/**
 * Log in with email + password. Prototype only — plaintext comparison.
 * Returns the user or null if credentials don't match.
 */
export async function loginLocal(email: string, password: string): Promise<User | null> {
  const user = _users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) return null;
  localStorage.setItem(AUTH_KEY, user.id);
  return user;
}

/**
 * Check if an email already exists among local users.
 */
export async function emailExists(email: string): Promise<boolean> {
  return _users.some((u) => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Create a new local account. Prototype only — password stored in plain text.
 * Replace with Supabase Auth signUp later.
 */
export async function createLocalAccount(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}): Promise<User> {
  const user: User = {
    id: `u_${Math.random().toString(36).slice(2, 9)}`,
    name: input.name,
    username: input.username,
    email: input.email,
    password: input.password, // ⚠️ prototype only
  };
  _users.push(user);
  saveJson(USERS_KEY, _users);
  localStorage.setItem(AUTH_KEY, user.id);
  return user;
}

/** Log out the current user. */
export async function logoutLocal(): Promise<void> {
  localStorage.removeItem(AUTH_KEY);
}

/** Update the current user's profile fields. */
export async function updateCurrentUser(patch: Partial<Pick<User, "name" | "username">>): Promise<User | null> {
  const me = _getMe();
  if (!me) return null;
  const idx = _users.findIndex((u) => u.id === me.id);
  if (idx === -1) return null;
  if (patch.name) _users[idx].name = patch.name;
  if (patch.username) _users[idx].username = patch.username;
  saveJson(USERS_KEY, _users);
  return _users[idx];
}

/* ── Users ───────────────────────────────────────── */

export async function listUsers(): Promise<User[]> {
  return _users;
}

export async function getUser(id: string): Promise<User | undefined> {
  return _users.find((u) => u.id === id);
}

/* ── Groups ──────────────────────────────────────── */

export async function listGroups(): Promise<FriendGroup[]> {
  return [..._groups];
}

export async function getGroup(id: string): Promise<FriendGroup | undefined> {
  return _groups.find((g) => g.id === id);
}

export async function listGroupMembers(groupId: string): Promise<User[]> {
  const g = _groups.find((gr) => gr.id === groupId);
  if (!g) return [];
  return _users.filter((u) => g.memberIds.includes(u.id));
}

export async function createGroup(
  input: Omit<FriendGroup, "id">,
): Promise<FriendGroup> {
  const group: FriendGroup = {
    ...input,
    id: `g_${Math.random().toString(36).slice(2, 9)}`,
  };
  _groups = [..._groups, group];
  saveJson(GROUPS_KEY, _groups);
  return group;
}

export async function updateGroup(
  id: string,
  input: Partial<Omit<FriendGroup, "id">>,
): Promise<FriendGroup | undefined> {
  const idx = _groups.findIndex((g) => g.id === id);
  if (idx === -1) return undefined;
  _groups[idx] = { ..._groups[idx], ...input };
  saveJson(GROUPS_KEY, _groups);
  return _groups[idx];
}

export async function deleteGroup(id: string): Promise<boolean> {
  if (id === "g4") return false;
  const idx = _groups.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  _groups.splice(idx, 1);
  saveJson(GROUPS_KEY, _groups);
  return true;
}

export async function groupHasPosts(groupId: string): Promise<boolean> {
  return _posts.some((p) => p.visibleToGroupId === groupId);
}

/** Remove a user from all custom groups (called when unfriending). */
export async function removeUserFromAllGroups(userId: string): Promise<void> {
  for (const g of _groups) {
    g.memberIds = g.memberIds.filter((id) => id !== userId);
  }
  saveJson(GROUPS_KEY, _groups);
}

/* ── Posts ────────────────────────────────────────── */

export async function listFeed(): Promise<AvailabilityPost[]> {
  return [..._posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function listPostsByGroup(groupId: string): Promise<AvailabilityPost[]> {
  return _posts
    .filter((p) => p.visibleToGroupId === groupId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPost(id: string): Promise<AvailabilityPost | undefined> {
  return _posts.find((p) => p.id === id);
}

export async function createPost(
  input: Omit<AvailabilityPost, "id" | "authorId" | "createdAt">,
): Promise<AvailabilityPost> {
  const me = _getMe();
  const post: AvailabilityPost = {
    ...input,
    id: `p_${Math.random().toString(36).slice(2, 9)}`,
    authorId: me?.id ?? "u_me",
    createdAt: new Date().toISOString(),
  };
  _posts = [post, ..._posts];
  saveJson(POSTS_KEY, _posts);
  return post;
}

export async function updatePost(
  id: string,
  input: Omit<AvailabilityPost, "id" | "authorId" | "createdAt">,
): Promise<AvailabilityPost | undefined> {
  const me = _getMe();
  const meId = me?.id ?? "u_me";
  const idx = _posts.findIndex((p) => p.id === id && p.authorId === meId);
  if (idx === -1) return undefined;
  _posts[idx] = { ..._posts[idx], ...input };
  saveJson(POSTS_KEY, _posts);
  return _posts[idx];
}

export async function deletePost(id: string): Promise<boolean> {
  const me = _getMe();
  const meId = me?.id ?? "u_me";
  const idx = _posts.findIndex((p) => p.id === id && p.authorId === meId);
  if (idx === -1) return false;
  _posts.splice(idx, 1);
  saveJson(POSTS_KEY, _posts);
  return true;
}

/* ── Chat ────────────────────────────────────────── */

export async function listChatMessages(groupId: string): Promise<ChatMessage[]> {
  return _chats
    .filter((m) => m.groupId === groupId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function sendChatMessage(
  groupId: string,
  body: string,
): Promise<ChatMessage> {
  const me = _getMe();
  const msg: ChatMessage = {
    id: `m_${Math.random().toString(36).slice(2, 9)}`,
    groupId,
    authorId: me?.id ?? "u_me",
    body,
    createdAt: new Date().toISOString(),
  };
  _chats = [..._chats, msg];
  saveJson(CHAT_KEY, _chats);
  return msg;
}

export async function getLatestChatMessage(groupId: string): Promise<ChatMessage | undefined> {
  const msgs = _chats.filter((m) => m.groupId === groupId);
  if (msgs.length === 0) return undefined;
  return msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export async function getRecentMessagesForGroup(groupId: string, limit = 3): Promise<ChatMessage[]> {
  return _chats
    .filter((m) => m.groupId === groupId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .reverse();
}

/* ── Friends ──────────────────────────────────────── */

export async function listFriendships(): Promise<Friendship[]> {
  return [..._friends];
}

export async function getFriendshipStatus(userId: string): Promise<FriendshipStatus> {
  const f = _friends.find((fr) => fr.userId === userId);
  return f?.status ?? "none";
}

export async function listAcceptedFriends(): Promise<User[]> {
  const accepted = _friends.filter((f) => f.status === "accepted").map((f) => f.userId);
  return _users.filter((u) => accepted.includes(u.id));
}

export async function sendFriendRequest(userId: string): Promise<Friendship> {
  const existing = _friends.find((f) => f.userId === userId);
  if (existing) {
    existing.status = "pending";
  } else {
    _friends.push({ userId, status: "pending" });
  }
  saveJson(FRIENDS_KEY, _friends);
  return _friends.find((f) => f.userId === userId)!;
}

export async function acceptFriendRequest(userId: string): Promise<Friendship> {
  const existing = _friends.find((f) => f.userId === userId);
  if (existing) {
    existing.status = "accepted";
  } else {
    _friends.push({ userId, status: "accepted" });
  }
  saveJson(FRIENDS_KEY, _friends);
  return _friends.find((f) => f.userId === userId)!;
}

export async function removeFriend(userId: string): Promise<boolean> {
  const idx = _friends.findIndex((f) => f.userId === userId);
  if (idx === -1) return false;
  _friends.splice(idx, 1);
  saveJson(FRIENDS_KEY, _friends);
  // Also remove from all groups
  await removeUserFromAllGroups(userId);
  return true;
}

/** Search users by name, username, or email (excludes current user). */
export async function searchUsers(query: string): Promise<User[]> {
  const me = _getMe();
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return _users.filter(
    (u) =>
      u.id !== me?.id &&
      (u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)),
  );
}

/* ── Privacy ─────────────────────────────────────── */

export async function getPrivacy(): Promise<PrivacySettings> {
  return _privacy;
}

export async function updatePrivacy(
  patch: Partial<PrivacySettings>,
): Promise<PrivacySettings> {
  _privacy = { ..._privacy, ...patch };
  return _privacy;
}
