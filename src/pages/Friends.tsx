import { useEffect, useMemo, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  Clock,
  Check,
  Search,
  Pencil,
  X,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type FriendshipRow = {
  id: string;
  from_id: string;
  to_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  created_at: string;
  updated_at: string | null;
};

type FriendListItem = {
  profile: Profile;
  friendship: FriendshipRow;
  direction: "incoming" | "outgoing";
};

type FriendRecommendation = {
  profile: Profile;
  mutualCount: number;
  mutualNames: string[];
};

type RecommendationRpcRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  mutual_count: number;
  mutual_names: string[] | null;
};

export default function Friends() {
  const navigate = useNavigate();

  const [meId, setMeId] = useState("");
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [removeTarget, setRemoveTarget] = useState<FriendListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [editingNicknameFor, setEditingNicknameFor] = useState<string | null>(
    null,
  );
  const [nicknameInput, setNicknameInput] = useState("");
  const [recommendations, setRecommendations] = useState<
    FriendRecommendation[]
  >([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  const loadRecommendations = async (
    authUserId: string,
    rows: FriendshipRow[],
  ) => {
    setIsLoadingRecommendations(true);

    try {
      const acceptedFriendIds = rows
        .filter((friendship) => friendship.status === "accepted")
        .map((friendship) =>
          friendship.from_id === authUserId
            ? friendship.to_id
            : friendship.from_id,
        );

      if (acceptedFriendIds.length < 1) {
        setRecommendations([]);
        return;
      }

      const { data, error } = await supabase.rpc("get_friend_recommendations", {
        min_mutual: 3,
        result_limit: 5,
      });

      if (error) {
        console.error(error);
        toast.error("Could not load friend recommendations");
        setRecommendations([]);
        return;
      }

      const nextRecommendations: FriendRecommendation[] = (
        (data ?? []) as RecommendationRpcRow[]
      ).map((row) => ({
        profile: {
          id: row.id,
          username: row.username,
          display_name: row.display_name,
          avatar_url: row.avatar_url,
        },
        mutualCount: Number(row.mutual_count),
        mutualNames: row.mutual_names ?? [],
      }));

      setRecommendations(nextRecommendations);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const refresh = async () => {
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authUser = session?.user;

    if (!authUser) {
      setMeId("");
      setFriendships([]);
      setProfilesById({});
      setRecommendations([]);
      setIsLoading(false);
      return;
    }

    setMeId(authUser.id);

    const stored = localStorage.getItem(`nicknames_${authUser.id}`);
    setNicknames(stored ? JSON.parse(stored) : {});

    const { data: friendshipRows, error: friendshipsError } = await supabase
      .from("friendships")
      .select("id, from_id, to_id, status, created_at, updated_at")
      .or(`from_id.eq.${authUser.id},to_id.eq.${authUser.id}`)
      .order("created_at", { ascending: false });

    if (friendshipsError) {
      toast.error(friendshipsError.message);
      setIsLoading(false);
      return;
    }

    const rows = (friendshipRows ?? []) as FriendshipRow[];
    setFriendships(rows);

    const otherIds = Array.from(
      new Set(
        rows.map((friendship) =>
          friendship.from_id === authUser.id
            ? friendship.to_id
            : friendship.from_id,
        ),
      ),
    );

    const nextProfilesById: Record<string, Profile> = {};

    if (otherIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", otherIds);

      if (profilesError) {
        toast.error(profilesError.message);
        setIsLoading(false);
        return;
      }

      for (const profile of (profiles ?? []) as Profile[]) {
        nextProfilesById[profile.id] = profile;
      }
    }

    setProfilesById(nextProfilesById);
    setIsLoading(false);

    await loadRecommendations(authUser.id, rows);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery || !meId) {
      setSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .ilike("username", `%${cleanQuery}%`)
        .neq("id", meId)
        .limit(10);

      if (error) {
        toast.error(error.message);
        setSearchResults([]);
      } else {
        setSearchResults((data ?? []) as Profile[]);
      }

      setIsSearching(false);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, meId]);

  const friendItems = useMemo<FriendListItem[]>(() => {
    return friendships
      .map((friendship) => {
        const otherId =
          friendship.from_id === meId ? friendship.to_id : friendship.from_id;
        const profile = profilesById[otherId];

        if (!profile) return null;

        return {
          profile,
          friendship,
          direction: friendship.from_id === meId ? "outgoing" : "incoming",
        };
      })
      .filter(Boolean) as FriendListItem[];
  }, [friendships, profilesById, meId]);

  const accepted = friendItems.filter(
    (item) => item.friendship.status === "accepted",
  );

  const incomingPending = friendItems.filter(
    (item) =>
      item.friendship.status === "pending" && item.direction === "incoming",
  );

  const outgoingPending = friendItems.filter(
    (item) =>
      item.friendship.status === "pending" && item.direction === "outgoing",
  );

  const friendshipForProfile = (profileId: string) => {
    return friendships.find(
      (friendship) =>
        (friendship.from_id === meId && friendship.to_id === profileId) ||
        (friendship.from_id === profileId && friendship.to_id === meId),
    );
  };

  const handleAdd = async (profileId: string) => {
    if (!meId) return;

    const existing = friendshipForProfile(profileId);

    if (existing) {
      toast.info("There is already a friendship or request with this user");
      return;
    }

    const { error } = await supabase.from("friendships").insert({
      from_id: meId,
      to_id: profileId,
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Friend request sent");
    window.dispatchEvent(new Event("friend-requests-changed"));
    setQuery("");
    setSearchResults([]);
    refresh();
  };

  const handleAccept = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", friendshipId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Friend added");
    window.dispatchEvent(new Event("friend-requests-changed"));
    refresh();
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;

    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", removeTarget.friendship.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Friend removed");
    window.dispatchEvent(new Event("friend-requests-changed"));
    setRemoveTarget(null);
    refresh();
  };

  const nicknameFor = (profileId: string) => nicknames[profileId] ?? null;

  const displayName = (profile: Profile) =>
    nicknameFor(profile.id) ?? profile.display_name;

  const saveNickname = (profileId: string) => {
    const next = { ...nicknames };

    if (nicknameInput.trim() === "") {
      delete next[profileId];
    } else {
      next[profileId] = nicknameInput.trim();
    }

    setNicknames(next);
    localStorage.setItem(`nicknames_${meId}`, JSON.stringify(next));
    setEditingNicknameFor(null);
  };

  const renderFriendItem = (item: FriendListItem) => {
    const { profile, friendship, direction } = item;

    return (
      <li
        key={friendship.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={profile.display_name}
            avatarUrl={profile.avatar_url}
            size="md"
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {displayName(profile)}
            </p>

            {nicknameFor(profile.id) ? (
              <p className="truncate text-xs text-muted-foreground">
                {profile.display_name} · @{profile.username}
              </p>
            ) : (
              <p className="truncate text-xs text-muted-foreground">
                @{profile.username}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {friendship.status === "accepted" && (
            <div className="flex items-center gap-2">
              {editingNicknameFor === profile.id ? (
                <div className="flex items-center gap-1">
                  <input
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && saveNickname(profile.id)
                    }
                    placeholder="Nickname…"
                    className="h-7 w-24 rounded-lg border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />

                  <button
                    onClick={() => saveNickname(profile.id)}
                    className="text-primary hover:opacity-70"
                    aria-label="Save nickname"
                  >
                    <Check className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setEditingNicknameFor(null)}
                    className="text-muted-foreground hover:opacity-70"
                    aria-label="Cancel nickname edit"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingNicknameFor(profile.id);
                    setNicknameInput(nicknameFor(profile.id) ?? "");
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {nicknameFor(profile.id) ? "Edit" : "Nickname"}
                </button>
              )}

              <button
                onClick={() => setRemoveTarget(item)}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                <UserMinus className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          )}

          {friendship.status === "pending" && direction === "incoming" && (
            <button
              onClick={() => handleAccept(friendship.id)}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </button>
          )}

          {friendship.status === "pending" && direction === "outgoing" && (
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-primary-soft px-3 text-xs font-medium text-primary">
              <Clock className="h-3.5 w-3.5" />
              Pending
            </span>
          )}
        </div>
      </li>
    );
  };

  const renderSearchResult = (profile: Profile) => {
    const existing = friendshipForProfile(profile.id);

    return (
      <li
        key={profile.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={profile.display_name}
            avatarUrl={profile.avatar_url}
            size="md"
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {profile.display_name}
            </p>

            <p className="truncate text-xs text-muted-foreground">
              @{profile.username}
            </p>
          </div>
        </div>

        {existing ? (
          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {existing.status === "accepted" ? "Friends" : "Pending"}
          </span>
        ) : (
          <button
            onClick={() => handleAdd(profile.id)}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </li>
    );
  };

  const renderRecommendation = (recommendation: FriendRecommendation) => {
    const { profile, mutualCount, mutualNames } = recommendation;

    return (
      <li
        key={profile.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-[#DA2C43]/20 bg-card p-3 shadow-sm"
      >
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={profile.display_name}
            avatarUrl={profile.avatar_url}
            size="md"
            accent
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {profile.display_name}
            </p>

            <p className="truncate text-xs text-muted-foreground">
              @{profile.username}
            </p>

            <p className="truncate text-[11px] text-muted-foreground">
              {mutualCount} mutual friend{mutualCount === 1 ? "" : "s"}
              {mutualNames.length > 0 ? ` · ${mutualNames.join(", ")}` : ""}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleAdd(profile.id)}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#DA2C43] px-3 text-xs font-semibold text-white hover:bg-[#c9273c]"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add
        </button>
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      <header className="safe-top shrink-0 border-b border-border bg-background/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft/70 hover:text-primary"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              Friends
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              Find friends by username and manage your requests.
            </p>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username"
            className="h-11 rounded-2xl bg-card pl-9 focus-visible:ring-[#DA2C43]"
          />
        </div>
      </header>

      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto p-4 pb-28">
        {query.trim() ? (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Search results
            </h2>

            {isSearching ? (
              <p className="text-sm text-muted-foreground">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found</p>
            ) : (
              <ul className="space-y-2">
                {searchResults.map(renderSearchResult)}
              </ul>
            )}
          </section>
        ) : (
          <>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading friends...
              </p>
            ) : (
              <>
                {incomingPending.length > 0 && (
                  <section>
                    <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Requests · {incomingPending.length}
                    </h2>

                    <ul className="space-y-2">
                      {incomingPending.map(renderFriendItem)}
                    </ul>
                  </section>
                )}

                {recommendations.length > 0 && (
                  <section>
                    <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-[#DA2C43]" />
                      Friend recommendations
                    </h2>

                    <ul className="space-y-2">
                      {recommendations.map(renderRecommendation)}
                    </ul>
                  </section>
                )}

                {isLoadingRecommendations && accepted.length >= 3 && (
                  <p className="text-sm text-muted-foreground">
                    Finding friend recommendations...
                  </p>
                )}

                {accepted.length > 0 && (
                  <section>
                    <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Check className="h-3.5 w-3.5" />
                      Friends · {accepted.length}
                    </h2>

                    <ul className="space-y-2">
                      {accepted.map(renderFriendItem)}
                    </ul>
                  </section>
                )}

                {outgoingPending.length > 0 && (
                  <section>
                    <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Sent requests · {outgoingPending.length}
                    </h2>

                    <ul className="space-y-2">
                      {outgoingPending.map(renderFriendItem)}
                    </ul>
                  </section>
                )}

                {incomingPending.length === 0 &&
                  accepted.length === 0 &&
                  outgoingPending.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
                      No friends yet. Search for a username to add someone.
                    </div>
                  )}
              </>
            )}
          </>
        )}
      </div>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removeTarget?.profile.display_name}?
            </AlertDialogTitle>

            <AlertDialogDescription>
              They'll be removed from your friends list. You can add them back
              anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}