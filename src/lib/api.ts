/**
 * Data access layer.
 * Supabase-backed for auth, profiles, friends, groups and posts.
 * Some secondary prototype features are still local.
 */
import {
  ActivityType,
  AvailabilityPost,
  ChatMessage,
  Friendship,
  FriendGroup,
  FriendshipStatus,
  GroupSuggestion,
  PoolMembership,
  PostParticipation,
  PrivacySettings,
  User,
  UserLocation,
  WaitingPool,
  FriendNickname,
} from "./types";
import {
  defaultPrivacy,
  groups as mockGroups,
  posts as mockPosts,
  users as mockUsers,
} from "./mockData";
import { supabase } from "./supabaseClient";
import { sendNotification } from "./notifications";

/* ── Storage helpers ─────────────────────────────── */

const POSTS_KEY = "availability_posts";
const GROUPS_KEY = "friend_groups";
const CHAT_KEY = "chat_messages";
const FRIENDS_KEY = "friendships";
const USERS_KEY = "local_users";
const AUTH_KEY = "current_user_id";
const PARTICIPANTS_KEY = "post_participants";
const POOLS_KEY = "waiting_pools";
const POOL_MEMBERS_KEY = "pool_memberships";
const LOCATION_KEY = "user_location";
const SUGGESTIONS_KEY = "group_suggestions";
const NICKNAMES_KEY = "app_nicknames";
let _nicknames: FriendNickname[] = loadJson<FriendNickname[]>(NICKNAMES_KEY, []);

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

/* ── Local fallback state ────────────────────────── */

let _users: User[] = loadJson<User[]>(USERS_KEY, [...mockUsers]);
let _posts: AvailabilityPost[] = loadJson<AvailabilityPost[]>(POSTS_KEY, [
  ...mockPosts,
]);
let _groups: FriendGroup[] = loadJson<FriendGroup[]>(GROUPS_KEY, [
  ...mockGroups,
]);
let _chats: ChatMessage[] = loadJson<ChatMessage[]>(CHAT_KEY, []);
let _friends: Friendship[] = loadJson<Friendship[]>(FRIENDS_KEY, []);
let _privacy: PrivacySettings = { ...defaultPrivacy };
let _participants: PostParticipation[] = loadJson<PostParticipation[]>(
  PARTICIPANTS_KEY,
  [],
);
let _pools: WaitingPool[] = loadJson<WaitingPool[]>(POOLS_KEY, []);
let _poolMembers: PoolMembership[] = loadJson<PoolMembership[]>(
  POOL_MEMBERS_KEY,
  [],
);
let _suggestions: GroupSuggestion[] = loadJson<GroupSuggestion[]>(
  SUGGESTIONS_KEY,
  [],
);

/* ── Helpers ─────────────────────────────────────── */

function mapProfileToUser(profile: {
  id: string;
  username: string;
  display_name: string;
}): User {
  return {
    id: profile.id,
    name: profile.display_name,
    username: profile.username,
    email: "",
    password: "",
  };
}

async function getAuthUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id ?? null;
}

async function ensureProfile(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authUser = session?.user;

  if (!authUser) return null;

  const fallbackUsername =
    authUser.user_metadata?.username ||
    authUser.email?.split("@")[0] ||
    `user_${authUser.id.slice(0, 8)}`;

  const fallbackDisplayName =
    authUser.user_metadata?.display_name ||
    authUser.user_metadata?.name ||
    fallbackUsername;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existing) {
    return mapProfileToUser(existing);
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: authUser.id,
      username: fallbackUsername,
      display_name: fallbackDisplayName,
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
    })
    .select("id, username, display_name")
    .single();

  if (error || !data) {
    console.error("Ensure profile failed:", error);
    return {
      id: authUser.id,
      name: fallbackDisplayName,
      username: fallbackUsername,
      email: authUser.email ?? "",
      password: "",
    };
  }

  return mapProfileToUser(data);
}

/* ── Auth ────────────────────────────────────────── */

export async function getCurrentUser(): Promise<User | null> {
  return ensureProfile();
}

export async function isLoggedIn(): Promise<boolean> {
  const id = await getAuthUserId();
  return Boolean(id);
}

/* Legacy local auth helpers kept for old screens */
export async function loginLocal(
  email: string,
  password: string,
): Promise<User | null> {
  const user = _users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) return null;
  localStorage.setItem(AUTH_KEY, user.id);
  return user;
}

export async function emailExists(email: string): Promise<boolean> {
  return _users.some((u) => u.email.toLowerCase() === email.toLowerCase());
}

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
    password: input.password,
  };

  _users.push(user);
  saveJson(USERS_KEY, _users);
  localStorage.setItem(AUTH_KEY, user.id);

  return user;
}

export async function logoutLocal(): Promise<void> {
  localStorage.removeItem(AUTH_KEY);
}

export async function updateCurrentUser(
  patch: Partial<Pick<User, "name" | "username">>,
): Promise<User | null> {
  const me = await ensureProfile();
  if (!me) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: patch.name ?? me.name,
      username: patch.username ?? me.username,
    })
    .eq("id", me.id)
    .select("id, username, display_name")
    .single();

  if (error || !data) {
    console.error("Update current user failed:", error);
    return null;
  }

  return mapProfileToUser(data);
}

/* ── Users ───────────────────────────────────────── */

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .order("display_name", { ascending: true });

  if (error) {
    console.error("List users failed:", error);
    return [];
  }

  return (data ?? []).map(mapProfileToUser);
}

export async function getUser(id: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return mapProfileToUser(data);
}

/* ── Friends ─────────────────────────────────────── */

type FriendshipRow = {
  id: string;
  from_id: string;
  to_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
};

export async function listFriendships(): Promise<Friendship[]> {
  const meId = await getAuthUserId();
  if (!meId) return [];

  const { data, error } = await supabase
    .from("friendships")
    .select("id, from_id, to_id, status")
    .or(`from_id.eq.${meId},to_id.eq.${meId}`);

  if (error) {
    console.error("List friendships failed:", error);
    return [];
  }

  return ((data ?? []) as FriendshipRow[]).map((row) => ({
    userId: row.from_id === meId ? row.to_id : row.from_id,
    status: row.status as FriendshipStatus,
  }));
}

export async function getFriendshipStatus(
  userId: string,
): Promise<FriendshipStatus> {
  const friendships = await listFriendships();
  const f = friendships.find((fr) => fr.userId === userId);
  return f?.status ?? "none";
}

export async function listAcceptedFriends(): Promise<User[]> {
  const meId = await getAuthUserId();
  if (!meId) return [];

  const { data, error } = await supabase
    .from("friendships")
    .select("from_id, to_id, status")
    .or(`from_id.eq.${meId},to_id.eq.${meId}`)
    .eq("status", "accepted");

  if (error) {
    console.error("List accepted friends failed:", error);
    return [];
  }

  const friendIds = ((data ?? []) as FriendshipRow[]).map((row) =>
    row.from_id === meId ? row.to_id : row.from_id,
  );

  if (friendIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", friendIds);

  if (profilesError) {
    console.error("List accepted friend profiles failed:", profilesError);
    return [];
  }

  return (profiles ?? []).map(mapProfileToUser);
}

export async function sendFriendRequest(userId: string): Promise<Friendship> {
  const meId = await getAuthUserId();
  if (!meId) throw new Error("You must be logged in");

  const { error } = await supabase.from("friendships").insert({
    from_id: meId,
    to_id: userId,
    status: "pending",
  });

  if (error) throw error;

  return { userId, status: "pending" };
}

export async function acceptFriendRequest(
  userId: string,
): Promise<Friendship> {
  const meId = await getAuthUserId();
  if (!meId) throw new Error("You must be logged in");

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("from_id", userId)
    .eq("to_id", meId);

  if (error) throw error;

  return { userId, status: "accepted" };
}

export async function removeFriend(userId: string): Promise<boolean> {
  const meId = await getAuthUserId();
  if (!meId) return false;

  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(from_id.eq.${meId},to_id.eq.${userId}),and(from_id.eq.${userId},to_id.eq.${meId})`,
    );

  if (error) {
    console.error("Remove friend failed:", error);
    return false;
  }

  await removeUserFromAllGroups(userId);

  return true;
}

export async function setFriendNickname(friendId: string, nickname: string): Promise<void> {
  const idx = _nicknames.findIndex((n) => n.friendId === friendId);
  if (nickname.trim() === "") {
    // Empty nickname = remove it
    if (idx !== -1) _nicknames.splice(idx, 1);
  } else if (idx !== -1) {
    _nicknames[idx].nickname = nickname.trim();
  } else {
    _nicknames.push({ friendId, nickname: nickname.trim() });
  }
  saveJson(NICKNAMES_KEY, _nicknames);
}

export async function getFriendNicknames(): Promise<FriendNickname[]> {
  return [..._nicknames];
}

export async function searchUsers(query: string): Promise<User[]> {
  const meId = await getAuthUserId();
  const q = query.toLowerCase().trim();

  if (!q) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq("id", meId ?? "")
    .limit(20);

  if (error) {
    console.error("Search users failed:", error);
    return [];
  }

  return (data ?? []).map(mapProfileToUser);
}

/* ── Groups ──────────────────────────────────────── */

type GroupRow = {
  id: string;
  owner_id: string;
  name: string;
  emoji: string;
  created_at: string;
};

type GroupMemberRow = {
  group_id: string;
  user_id: string;
};

async function getMemberIdsForGroups(groupIds: string[]) {
  if (groupIds.length === 0) return new Map<string, string[]>();

  const { data, error } = await supabase
    .from("group_members")
    .select("group_id, user_id")
    .in("group_id", groupIds);

  if (error) {
    console.error("Get group members failed:", error);
    return new Map<string, string[]>();
  }

  const map = new Map<string, string[]>();

  for (const row of (data ?? []) as GroupMemberRow[]) {
    const current = map.get(row.group_id) ?? [];
    current.push(row.user_id);
    map.set(row.group_id, current);
  }

  return map;
}

function mapGroup(row: GroupRow, memberIds: string[]): FriendGroup {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji || "",
    memberIds,
  };
}

export async function listGroups(): Promise<FriendGroup[]> {
  const { data, error } = await supabase
    .from("friend_groups")
    .select("id, owner_id, name, emoji, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List groups failed:", error);
    return [];
  }

  const rows = (data ?? []) as GroupRow[];
  const memberMap = await getMemberIdsForGroups(rows.map((g) => g.id));

  return rows.map((row) => mapGroup(row, memberMap.get(row.id) ?? []));
}

export async function getGroup(id: string): Promise<FriendGroup | undefined> {
  const { data, error } = await supabase
    .from("friend_groups")
    .select("id, owner_id, name, emoji, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  const memberMap = await getMemberIdsForGroups([id]);

  return mapGroup(data as GroupRow, memberMap.get(id) ?? []);
}

export async function listGroupMembers(groupId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (error) {
    console.error("List group members failed:", error);
    return [];
  }

  const ids = (data ?? []).map((row) => row.user_id as string);

  if (ids.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ids);

  if (profilesError) {
    console.error("List group member profiles failed:", profilesError);
    return [];
  }

  return (profiles ?? []).map(mapProfileToUser);
}

export async function createGroup(
  input: Omit<FriendGroup, "id">,
): Promise<FriendGroup> {
  const meId = await getAuthUserId();
  if (!meId) throw new Error("You must be logged in to create a group");

  const memberIds = Array.from(new Set([meId, ...input.memberIds]));

  const { data, error } = await supabase
    .from("friend_groups")
    .insert({
      owner_id: meId,
      name: input.name,
      emoji: input.emoji || "👥",
    })
    .select("id, owner_id, name, emoji, created_at")
    .single();

  if (error) {
    console.error("Create group failed:", error);
    throw error;
  }

  const group = data as GroupRow;

  const { error: membersError } = await supabase.from("group_members").insert(
    memberIds.map((id) => ({
      group_id: group.id,
      user_id: id,
    })),
  );

  if (membersError) {
    console.error("Create group members failed:", membersError);
    throw membersError;
  }

  return mapGroup(group, memberIds);
}

export async function updateGroup(
  id: string,
  input: Partial<Omit<FriendGroup, "id">>,
): Promise<FriendGroup | undefined> {
  const meId = await getAuthUserId();

  if (!meId) {
    throw new Error("You must be logged in to update a group");
  }

  const { data: groupData, error: groupLoadError } = await supabase
    .from("friend_groups")
    .select("id, owner_id, name, emoji, created_at")
    .eq("id", id)
    .maybeSingle();

  if (groupLoadError) {
    console.error("Load group before update failed:", groupLoadError);
    throw new Error(groupLoadError.message);
  }

  if (!groupData) {
    return undefined;
  }

  const groupRow = groupData as GroupRow;
  const isOwner = groupRow.owner_id === meId;

  let nextGroupRow = groupRow;

  // Only the owner may change group name / emoji.
  // Normal members may only add their own accepted friends as members.
  if (isOwner && (input.name !== undefined || input.emoji !== undefined)) {
    const { data: updatedGroup, error: updateError } = await supabase
      .from("friend_groups")
      .update({
        name: input.name ?? groupRow.name,
        emoji: input.emoji || groupRow.emoji || "👥",
      })
      .eq("id", id)
      .select("id, owner_id, name, emoji, created_at")
      .maybeSingle();

    if (updateError) {
      console.error("Update group failed:", updateError);
      throw new Error(updateError.message);
    }

    if (updatedGroup) {
      nextGroupRow = updatedGroup as GroupRow;
    }
  }

  const currentMemberMap = await getMemberIdsForGroups([id]);
  const currentMemberIds = currentMemberMap.get(id) ?? [];

  if (input.memberIds) {
    const requestedMemberIds = Array.from(
      new Set([meId, ...input.memberIds]),
    );

    if (isOwner) {
      const membersToRemove = currentMemberIds.filter(
        (memberId) => !requestedMemberIds.includes(memberId),
      );

      const membersToAdd = requestedMemberIds.filter(
        (memberId) => !currentMemberIds.includes(memberId),
      );

      if (membersToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", id)
          .in("user_id", membersToRemove);

        if (deleteError) {
          console.error("Remove group members failed:", deleteError);
          throw new Error(deleteError.message);
        }
      }

      if (membersToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("group_members")
          .insert(
            membersToAdd.map((userId) => ({
              group_id: id,
              user_id: userId,
            })),
          );

        if (insertError) {
          console.error("Add group members failed:", insertError);
          throw new Error(insertError.message);
        }
      }
    } else {
      // Non-owner members can only ADD people.
      // They cannot rename the group and cannot remove existing members.
      const membersToAdd = requestedMemberIds.filter(
        (memberId) => !currentMemberIds.includes(memberId),
      );

      if (membersToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("group_members")
          .insert(
            membersToAdd.map((userId) => ({
              group_id: id,
              user_id: userId,
            })),
          );

        if (insertError) {
          console.error("Add group members as member failed:", insertError);
          throw new Error(insertError.message);
        }
      }
    }
  }

  const finalMemberMap = await getMemberIdsForGroups([id]);
  const finalMemberIds = finalMemberMap.get(id) ?? [];

  return mapGroup(nextGroupRow, finalMemberIds);
}

export async function deleteGroup(id: string): Promise<boolean> {
  const { error } = await supabase.from("friend_groups").delete().eq("id", id);

  if (error) {
    console.error("Delete group failed:", error);
    return false;
  }

  return true;
}

export async function groupHasPosts(groupId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .eq("visible_to_group_id", groupId)
    .limit(1);

  if (error) {
    console.error("Check group posts failed:", error);
    return false;
  }

  return (data ?? []).length > 0;
}

export async function removeUserFromAllGroups(userId: string): Promise<void> {
  const groups = await listGroups();

  for (const group of groups) {
    if (!group.memberIds.includes(userId)) continue;

    await updateGroup(group.id, {
      ...group,
      memberIds: group.memberIds.filter((id) => id !== userId),
    });
  }
}

/* ── Posts ───────────────────────────────────────── */

type SupabasePostRow = {
  id: string;
  author_id: string;
  status: string;
  message: string | null;
  start_time: string;
  end_time: string;
  location_name: string | null;
  location_precision: string;
  visible_to_group_id: string | null;
  created_at: string;
};

function mapSupabasePost(row: SupabasePostRow): AvailabilityPost {
  return {
    id: row.id,
    authorId: row.author_id,
    status: row.status as AvailabilityPost["status"],
    message: row.message ?? undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    locationName: row.location_name ?? undefined,
    locationPrecision:
      row.location_precision as AvailabilityPost["locationPrecision"],
    visibleToGroupId: row.visible_to_group_id ?? "",
    createdAt: row.created_at,
  };
}

export async function listFeed(): Promise<AvailabilityPost[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, author_id, status, message, start_time, end_time, location_name, location_precision, visible_to_group_id, created_at",
    )
    .gt("end_time", now)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("List feed failed:", error);
    return [];
  }

  return ((data ?? []) as SupabasePostRow[]).map(mapSupabasePost);
}

export async function listPostsByGroup(
  groupId: string,
): Promise<AvailabilityPost[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, author_id, status, message, start_time, end_time, location_name, location_precision, visible_to_group_id, created_at",
    )
    .eq("visible_to_group_id", groupId)
    .gt("end_time", now)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("List group posts failed:", error);
    return [];
  }

  return ((data ?? []) as SupabasePostRow[]).map(mapSupabasePost);
}

export async function getPost(
  id: string,
): Promise<AvailabilityPost | undefined> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, author_id, status, message, start_time, end_time, location_name, location_precision, visible_to_group_id, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return mapSupabasePost(data as SupabasePostRow);
}

export async function createPost(
  input: Omit<AvailabilityPost, "id" | "authorId" | "createdAt">,
): Promise<AvailabilityPost> {
  const me = await ensureProfile();

  if (!me) {
    throw new Error("You must be logged in to create a post");
  }

  const visibleToGroupId = input.visibleToGroupId || null;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: me.id,
      status: input.status,
      message: input.message ?? null,
      start_time: input.startTime,
      end_time: input.endTime,
      location_name: input.locationName ?? null,
      location_precision: input.locationPrecision,
      visible_to_group_id: visibleToGroupId,
    })
    .select(
      "id, author_id, status, message, start_time, end_time, location_name, location_precision, visible_to_group_id, created_at",
    )
    .single();

  if (error) {
    console.error("Create post failed:", error);
    throw new Error(error.message);
  }

  (async () => {
    try {
      const group = await getGroup(input.visibleToGroupId);
      const others = (group?.memberIds ?? []).filter((id) => id !== me.id);
      sendNotification(others, `${me.name} is ${input.status}`,
        input.message || "Just posted they're free", "/feed", "new-post");
    } catch {}
  })();

  return mapSupabasePost(data as SupabasePostRow);
}

export async function updatePost(
  id: string,
  input: Omit<AvailabilityPost, "id" | "authorId" | "createdAt">,
): Promise<AvailabilityPost | undefined> {
  const meId = await getAuthUserId();

  if (!meId) {
    throw new Error("You must be logged in to update a post");
  }

  const visibleToGroupId = input.visibleToGroupId || null;

  const { data, error } = await supabase
    .from("posts")
    .update({
      status: input.status,
      message: input.message ?? null,
      start_time: input.startTime,
      end_time: input.endTime,
      location_name: input.locationName ?? null,
      location_precision: input.locationPrecision,
      visible_to_group_id: visibleToGroupId,
    })
    .eq("id", id)
    .eq("author_id", meId)
    .select(
      "id, author_id, status, message, start_time, end_time, location_name, location_precision, visible_to_group_id, created_at",
    )
    .maybeSingle();

  if (error) {
    console.error("Update post failed:", error);
    throw new Error(error.message);
  }

  if (!data) {
    return undefined;
  }

  return mapSupabasePost(data as SupabasePostRow);
}

export async function deletePost(id: string): Promise<boolean> {
  const meId = await getAuthUserId();

  if (!meId) {
    return false;
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("author_id", meId);

  if (error) {
    console.error("Delete post failed:", error);
    return false;
  }

  return true;
}

/* ── Chat ────────────────────────────────────────── */

type SupabaseChatMessageRow = {
  id: string;
  group_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

function mapSupabaseChatMessage(row: SupabaseChatMessageRow): ChatMessage {
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function listChatMessages(
  groupId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, group_id, author_id, body, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("List chat messages failed:", error);
    return [];
  }

  return ((data ?? []) as SupabaseChatMessageRow[]).map(
    mapSupabaseChatMessage,
  );
}

export async function sendChatMessage(
  groupId: string,
  body: string,
): Promise<ChatMessage> {
  const me = await getCurrentUser();

  if (!me) {
    throw new Error("You must be logged in to send a message");
  }

  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error("Message cannot be empty");
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      group_id: groupId,
      author_id: me.id,
      body: cleanBody,
    })
    .select("id, group_id, author_id, body, created_at")
    .single();

  if (error) {
    console.error("Send chat message failed:", error);
    throw new Error(error.message);
  }

  (async () => {
    try {
      const group = await getGroup(groupId);
      const others = (group?.memberIds ?? []).filter((id) => id !== me.id);
      sendNotification(others, `${me.name} in ${group?.name ?? "group"}`,
        cleanBody, "/groups", `chat-${groupId}`);
    } catch {}
  })();

  return mapSupabaseChatMessage(data as SupabaseChatMessageRow);
}

export async function getLatestChatMessage(
  groupId: string,
): Promise<ChatMessage | undefined> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, group_id, author_id, body, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return mapSupabaseChatMessage(data as SupabaseChatMessageRow);
}

export async function getRecentMessagesForGroup(
  groupId: string,
  limit = 3,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, group_id, author_id, body, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Get recent messages failed:", error);
    return [];
  }

  return ((data ?? []) as SupabaseChatMessageRow[])
    .map(mapSupabaseChatMessage)
    .reverse();
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

/* ── Participation ───────────────────────────────── */

type SupabasePostParticipationRow = {
  id: string;
  post_id: string;
  user_id: string;
  response_message: string | null;
  created_at: string;
};

function mapSupabasePostParticipation(
  row: SupabasePostParticipationRow,
): PostParticipation {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    responseMessage: row.response_message ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listPostParticipants(
  postId: string,
): Promise<PostParticipation[]> {
  const { data, error } = await supabase
    .from("post_participations")
    .select("id, post_id, user_id, response_message, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("List post participants failed:", error);
    return [];
  }

  return ((data ?? []) as SupabasePostParticipationRow[]).map(
    mapSupabasePostParticipation,
  );
}

export async function joinPost(
  postId: string,
  responseMessage?: string,
): Promise<PostParticipation> {
  const me = await getCurrentUser();

  if (!me) {
    throw new Error("You must be logged in to join this post");
  }

  const { data, error } = await supabase
    .from("post_participations")
    .upsert(
      {
        post_id: postId,
        user_id: me.id,
        response_message: responseMessage?.trim() || null,
      },
      {
        onConflict: "post_id,user_id",
      },
    )
    .select("id, post_id, user_id, response_message, created_at")
    .single();

  if (error) {
    console.error("Join post failed:", error);
    throw new Error(error.message);
  }

  (async () => {
    try {
      const post = await getPost(postId);
      if (post && post.authorId !== me.id) {
        sendNotification([post.authorId], `${me.name} joined your activity`,
          responseMessage ?? "Someone is joining!", "/feed", `join-${postId}`);
      }
    } catch {}
  })();

  return mapSupabasePostParticipation(data as SupabasePostParticipationRow);
}

export async function leavePost(postId: string): Promise<boolean> {
  const me = await getCurrentUser();

  if (!me) {
    return false;
  }

  const { error } = await supabase
    .from("post_participations")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", me.id);

  if (error) {
    console.error("Leave post failed:", error);
    return false;
  }

  return true;
}

export async function isCurrentUserParticipating(
  postId: string,
): Promise<boolean> {
  const me = await getCurrentUser();

  if (!me) {
    return false;
  }

  const { data, error } = await supabase
    .from("post_participations")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", me.id)
    .maybeSingle();

  if (error) {
    console.error("Check post participation failed:", error);
    return false;
  }

  return Boolean(data);
}

export async function getParticipantCount(postId: string): Promise<number> {
  const { count, error } = await supabase
    .from("post_participations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("post_id", postId);

  if (error) {
    console.error("Get participant count failed:", error);
    return 0;
  }

  return count ?? 0;
}
/* ── Waiting Pools ───────────────────────────────── */

type SupabasePoolRow = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  visible_to_group_id: string | null;
  min_people: number;
  created_at: string;
};

type SupabasePoolMembershipRow = {
  pool_id: string;
  user_id: string;
  joined_at: string;
};

function mapSupabasePool(
  row: SupabasePoolRow,
  memberIds: string[] = [],
): WaitingPool {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    description: row.description ?? undefined,
    date: row.date,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    visibleToGroupId: row.visible_to_group_id ?? "",
    memberIds,
    minPeople: row.min_people,
    createdAt: row.created_at,
  };
}

async function getPoolMemberIds(poolIds: string[]) {
  const result = new Map<string, string[]>();

  if (poolIds.length === 0) {
    return result;
  }

  const { data, error } = await supabase
    .from("pool_memberships")
    .select("pool_id, user_id, joined_at")
    .in("pool_id", poolIds);

  if (error) {
    console.error("Get pool members failed:", error);
    return result;
  }

  for (const row of (data ?? []) as SupabasePoolMembershipRow[]) {
    const current = result.get(row.pool_id) ?? [];
    current.push(row.user_id);
    result.set(row.pool_id, current);
  }

  return result;
}

export async function listPools(): Promise<WaitingPool[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("waiting_pools")
    .select(
      "id, author_id, title, description, date, start_time, end_time, visible_to_group_id, min_people, created_at",
    )
    .gte("date", today)
    .order("date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List pools failed:", error);
    return [];
  }

  const rows = (data ?? []) as SupabasePoolRow[];
  const memberMap = await getPoolMemberIds(rows.map((pool) => pool.id));

  return rows.map((row) => mapSupabasePool(row, memberMap.get(row.id) ?? []));
}

export async function getPool(id: string): Promise<WaitingPool | undefined> {
  const { data, error } = await supabase
    .from("waiting_pools")
    .select(
      "id, author_id, title, description, date, start_time, end_time, visible_to_group_id, min_people, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error("Get pool failed:", error);
    return undefined;
  }

  const memberMap = await getPoolMemberIds([id]);

  return mapSupabasePool(
    data as SupabasePoolRow,
    memberMap.get(id) ?? [],
  );
}

export async function createPool(
  input: Omit<WaitingPool, "id" | "authorId" | "memberIds" | "createdAt">,
): Promise<WaitingPool> {
  const me = await getCurrentUser();

  if (!me) {
    throw new Error("You must be logged in to create a pool");
  }

  const visibleToGroupId = input.visibleToGroupId || null;

  const { data, error } = await supabase
    .from("waiting_pools")
    .insert({
      author_id: me.id,
      title: input.title,
      description: input.description ?? null,
      date: input.date,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      visible_to_group_id: visibleToGroupId,
      min_people: input.minPeople,
    })
    .select(
      "id, author_id, title, description, date, start_time, end_time, visible_to_group_id, min_people, created_at",
    )
    .single();

  if (error) {
    console.error("Create pool failed:", error);
    throw new Error(error.message);
  }

  const pool = data as SupabasePoolRow;

  const { error: membershipError } = await supabase
    .from("pool_memberships")
    .insert({
      pool_id: pool.id,
      user_id: me.id,
    });

  if (membershipError) {
    console.error("Create pool membership failed:", membershipError);
    throw new Error(membershipError.message);
  }

  (async () => {
    try {
      const group = await getGroup(input.visibleToGroupId);
      const others = (group?.memberIds ?? []).filter((id) => id !== me.id);
      sendNotification(others, `${me.name} opened a waiting pool`,
        input.title, "/feed", `newpool-${pool.id}`);
    } catch {}
  })();

  return mapSupabasePool(pool, [me.id]);
}

export async function deletePool(id: string): Promise<boolean> {
  const me = await getCurrentUser();

  if (!me) {
    return false;
  }

  const { error } = await supabase
    .from("waiting_pools")
    .delete()
    .eq("id", id)
    .eq("author_id", me.id);

  if (error) {
    console.error("Delete pool failed:", error);
    return false;
  }

  return true;
}

export async function joinPool(poolId: string): Promise<boolean> {
  const me = await getCurrentUser();

  if (!me) {
    return false;
  }

  const { error } = await supabase
    .from("pool_memberships")
    .insert({
      pool_id: poolId,
      user_id: me.id,
    });

  if (error) {
    if (error.code === "23505") {
      return false;
    }

    console.error("Join pool failed:", error);
    return false;
  }

  (async () => {
    try {
      const pool = await getPool(poolId);
      if (pool && pool.authorId !== me.id) {
        sendNotification([pool.authorId], `${me.name} joined your pool`,
          pool.title, "/feed", `joinpool-${poolId}`);
      }
    } catch {}
  })();

  return true;
}

export async function leavePool(poolId: string): Promise<boolean> {
  const me = await getCurrentUser();

  if (!me) {
    return false;
  }

  const { error } = await supabase
    .from("pool_memberships")
    .delete()
    .eq("pool_id", poolId)
    .eq("user_id", me.id);

  if (error) {
    console.error("Leave pool failed:", error);
    return false;
  }

  return true;
}

export async function isInPool(poolId: string): Promise<boolean> {
  const me = await getCurrentUser();

  if (!me) {
    return false;
  }

  const { data, error } = await supabase
    .from("pool_memberships")
    .select("pool_id")
    .eq("pool_id", poolId)
    .eq("user_id", me.id)
    .maybeSingle();

  if (error) {
    console.error("Check pool membership failed:", error);
    return false;
  }

  return Boolean(data);
}

export async function listPoolMembers(poolId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from("pool_memberships")
    .select("user_id")
    .eq("pool_id", poolId);

  if (error) {
    console.error("List pool member ids failed:", error);
    return [];
  }

  const ids = (data ?? []).map((row) => row.user_id as string);

  if (ids.length === 0) {
    return [];
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ids);

  if (profilesError) {
    console.error("List pool member profiles failed:", profilesError);
    return [];
  }

  return (profiles ?? []).map(mapProfileToUser);
}

export async function listPoolsByGroup(
  groupId: string,
): Promise<WaitingPool[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("waiting_pools")
    .select(
      "id, author_id, title, description, date, start_time, end_time, visible_to_group_id, min_people, created_at",
    )
    .eq("visible_to_group_id", groupId)
    .gte("date", today)
    .order("date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List pools by group failed:", error);
    return [];
  }

  const rows = (data ?? []) as SupabasePoolRow[];
  const memberMap = await getPoolMemberIds(rows.map((pool) => pool.id));

  return rows.map((row) => mapSupabasePool(row, memberMap.get(row.id) ?? []));
}

export async function updatePool(
  id: string,
  input: Partial<
    Pick<
      WaitingPool,
      "title" | "description" | "date" | "startTime" | "endTime" | "minPeople"
    >
  >,
): Promise<WaitingPool | undefined> {
  const me = await getCurrentUser();

  if (!me) {
    throw new Error("You must be logged in to update a pool");
  }

  const updatePayload: Record<string, unknown> = {};

  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.description !== undefined) {
    updatePayload.description = input.description ?? null;
  }
  if (input.date !== undefined) updatePayload.date = input.date;
  if (input.startTime !== undefined) {
    updatePayload.start_time = input.startTime ?? null;
  }
  if (input.endTime !== undefined) {
    updatePayload.end_time = input.endTime ?? null;
  }
  if (input.minPeople !== undefined) updatePayload.min_people = input.minPeople;

  const { data, error } = await supabase
    .from("waiting_pools")
    .update(updatePayload)
    .eq("id", id)
    .eq("author_id", me.id)
    .select(
      "id, author_id, title, description, date, start_time, end_time, visible_to_group_id, min_people, created_at",
    )
    .maybeSingle();

  if (error) {
    console.error("Update pool failed:", error);
    throw new Error(error.message);
  }

  if (!data) {
    return undefined;
  }

  const memberMap = await getPoolMemberIds([id]);

  return mapSupabasePool(
    data as SupabasePoolRow,
    memberMap.get(id) ?? [],
  );
}
/* ── User Location ───────────────────────────────── */

export async function getUserLocation(): Promise<UserLocation | null> {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
}

export async function saveUserLocation(loc: UserLocation): Promise<void> {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
}

/* ── Group Suggestions ───────────────────────────── */

type SupabaseGroupSuggestionRow = {
  id: string;
  group_id: string;
  from_user_id: string;
  card_title: string;
  card_type: ActivityType;
  card_area: string;
  card_description: string;
  votes: Record<string, "up" | "down"> | null;
  created_at: string;
};

function mapSupabaseGroupSuggestion(
  row: SupabaseGroupSuggestionRow,
): GroupSuggestion {
  return {
    id: row.id,
    groupId: row.group_id,
    fromUserId: row.from_user_id,
    cardTitle: row.card_title,
    cardType: row.card_type,
    cardArea: row.card_area,
    cardDescription: row.card_description,
    votes: row.votes ?? {},
    createdAt: row.created_at,
  };
}

export async function suggestToGroup(
  groupId: string,
  card: {
    title: string;
    type: ActivityType;
    area: string;
    description: string;
  },
): Promise<GroupSuggestion> {
  const me = await getCurrentUser();

  if (!me) {
    throw new Error("You must be logged in to suggest a place");
  }

  const { data, error } = await supabase
    .from("group_suggestions")
    .insert({
      group_id: groupId,
      from_user_id: me.id,
      card_title: card.title,
      card_type: card.type,
      card_area: card.area,
      card_description: card.description,
      votes: {},
    })
    .select(
      "id, group_id, from_user_id, card_title, card_type, card_area, card_description, votes, created_at",
    )
    .single();

  if (error) {
    console.error("Suggest to group failed:", error);
    throw new Error(error.message);
  }

  return mapSupabaseGroupSuggestion(data as SupabaseGroupSuggestionRow);
}

export async function listGroupSuggestions(
  groupId: string,
): Promise<GroupSuggestion[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("group_suggestions")
    .select(
      "id, group_id, from_user_id, card_title, card_type, card_area, card_description, votes, created_at",
    )
    .eq("group_id", groupId)
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List group suggestions failed:", error);
    return [];
  }

  return ((data ?? []) as SupabaseGroupSuggestionRow[]).map(
    mapSupabaseGroupSuggestion,
  );
}

export async function voteOnSuggestion(
  suggestionId: string,
  vote: "up" | "down",
): Promise<void> {
  const me = await getCurrentUser();

  if (!me) {
    throw new Error("You must be logged in to vote");
  }

  const { data, error } = await supabase
    .from("group_suggestions")
    .select(
      "id, group_id, from_user_id, card_title, card_type, card_area, card_description, votes, created_at",
    )
    .eq("id", suggestionId)
    .maybeSingle();

  if (error || !data) {
    console.error("Load suggestion failed:", error);
    throw new Error("Suggestion not found");
  }

  const suggestion = data as SupabaseGroupSuggestionRow;
  const votes = { ...(suggestion.votes ?? {}) };

  if (votes[me.id] === vote) {
    delete votes[me.id];
  } else {
    votes[me.id] = vote;
  }

  const { error: updateError } = await supabase
    .from("group_suggestions")
    .update({ votes })
    .eq("id", suggestionId);

  if (updateError) {
    console.error("Vote suggestion failed:", updateError);
    throw new Error(updateError.message);
  }
}

export async function deleteSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from("group_suggestions")
    .delete()
    .eq("id", suggestionId);

  if (error) {
    console.error("Delete suggestion failed:", error);
    throw new Error(error.message);
  }
}