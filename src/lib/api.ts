/**
 * Data access layer.
 * Currently backed by in-memory mocks. When Supabase is added,
 * swap each function to a query against the appropriate table.
 * Component code only imports from here, never from mockData directly.
 */
import {
  AvailabilityPost,
  FriendGroup,
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

let _posts: AvailabilityPost[] = [...mockPosts];
let _privacy: PrivacySettings = { ...defaultPrivacy };

export async function getCurrentUser(): Promise<User> {
  return mockMe;
}

export async function listUsers(): Promise<User[]> {
  return mockUsers;
}

export async function getUser(id: string): Promise<User | undefined> {
  return mockUsers.find((u) => u.id === id);
}

export async function listGroups(): Promise<FriendGroup[]> {
  return mockGroups;
}

export async function listFeed(): Promise<AvailabilityPost[]> {
  // Newest first
  return [..._posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
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
  return post;
}

export async function getPrivacy(): Promise<PrivacySettings> {
  return _privacy;
}

export async function updatePrivacy(
  patch: Partial<PrivacySettings>,
): Promise<PrivacySettings> {
  _privacy = { ..._privacy, ...patch };
  return _privacy;
}
