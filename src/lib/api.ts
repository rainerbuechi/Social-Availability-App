/**
 * Data access layer.
 * Currently backed by in-memory mocks + localStorage.
 * When Supabase is added, swap each function body.
 */
import {
  AvailabilityPost,
  ChatMessage,
  Friendship,
  FriendGroup,
  FriendshipStatus,
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

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T;
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

let _posts: AvailabilityPost[] = loadJson<AvailabilityPost[]>(POSTS_KEY, [...mockPosts]);
let _groups: FriendGroup[] = loadJson<FriendGroup[]>(GROUPS_KEY, [...mockGroups]);
let _chats: ChatMessage[] = loadJson<ChatMessage[]>(CHAT_KEY, []);
let _privacy: PrivacySettings = { ...defaultPrivacy };

/* ── Users ───────────────────────────────────────── */

export async function getCurrentUser(): Promise<User> {
  return mockMe;
}

export async function listUsers(): Promise<User[]> {
  return mockUsers;
}

export async function getUser(id: string): Promise<User | undefined> {
  return mockUsers.find((u) => u.id === id);
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
  return mockUsers.filter((u) => g.memberIds.includes(u.id));
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
  // Prevent deleting the "Everyone" group (g4)
  if (id === "g4") return false;
  const idx = _groups.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  _groups.splice(idx, 1);
  saveJson(GROUPS_KEY, _groups);
  return true;
}

/** Check if any posts reference this group */
export async function groupHasPosts(groupId: string): Promise<boolean> {
  return _posts.some((p) => p.visibleToGroupId === groupId);
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
  const post: AvailabilityPost = {
    ...input,
    id: `p_${Math.random().toString(36).slice(2, 9)}`,
    authorId: mockMe.id,
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
  const idx = _posts.findIndex((p) => p.id === id && p.authorId === mockMe.id);
  if (idx === -1) return undefined;
  _posts[idx] = { ..._posts[idx], ...input };
  saveJson(POSTS_KEY, _posts);
  return _posts[idx];
}

export async function deletePost(id: string): Promise<boolean> {
  const idx = _posts.findIndex((p) => p.id === id && p.authorId === mockMe.id);
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
  const msg: ChatMessage = {
    id: `m_${Math.random().toString(36).slice(2, 9)}`,
    groupId,
    authorId: mockMe.id,
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
