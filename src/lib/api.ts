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

const STORAGE_KEY = "availability_posts";

/**
 * Save posts array to localStorage with error handling.
 * Silently fails if storage is unavailable (e.g., private browsing).
 */
function _savePostsToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_posts));
  } catch (error) {
    console.warn("Failed to save posts to localStorage", error);
  }
}

/**
 * Initialize posts from localStorage, falling back to mockPosts if unavailable.
 */
function _initializePostsFromStorage(): AvailabilityPost[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to load posts from localStorage", error);
  }
  return [...mockPosts];
}

let _posts: AvailabilityPost[] = _initializePostsFromStorage();
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
  _savePostsToStorage();
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
