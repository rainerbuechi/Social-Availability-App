import { useEffect, useMemo, useState } from "react";
import { UserPlus, UserMinus, Clock, Check, Search } from "lucide-react";
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

export default function Friends() {
  const [meId, setMeId] = useState("");
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [removeTarget, setRemoveTarget] = useState<FriendListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

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
      setIsLoading(false);
      return;
    }

    setMeId(authUser.id);

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
        rows.map((f) => (f.from_id === authUser.id ? f.to_id : f.from_id)),
      ),
    );

    if (otherIds.length === 0) {
      setProfilesById({});
      setIsLoading(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", otherIds);

    if (profilesError) {
      toast.error(profilesError.message);
      setIsLoading(false);
      return;
    }

    const nextProfilesById: Record<string, Profile> = {};

    for (const profile of (profiles ?? []) as Profile[]) {
      nextProfilesById[profile.id] = profile;
    }

    setProfilesById(nextProfilesById);
    setIsLoading(false);
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
        const otherId = friendship.from_id === meId ? friendship.to_id : friendship.from_id;
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

  const accepted = friendItems.filter((item) => item.friendship.status === "accepted");
  const incomingPending = friendItems.filter(
    (item) => item.friendship.status === "pending" && item.direction === "incoming",
  );
  const outgoingPending = friendItems.filter(
    (item) => item.friendship.status === "pending" && item.direction === "outgoing",
  );

  const friendshipForProfile = (profileId: string) => {
    return friendships.find(
      (f) =>
        (f.from_id === meId && f.to_id === profileId) ||
        (f.from_id === profileId && f.to_id === meId),
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
    setRemoveTarget(null);
    refresh();
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const renderFriendItem = (item: FriendListItem) => {
    const { profile, friendship, direction } = item;

    return (
      <li
        key={friendship.id}
        className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
            {initials(profile.display_name)}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        <div className="shrink-0">
          {friendship.status === "accepted" && (
            <button
              onClick={() => setRemoveTarget(item)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Remove
            </button>
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
        className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
            {initials(profile.display_name)}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.display_name}</p>
            <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
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

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight">Friends</h1>

        <p className="mt-1 text-xs text-muted-foreground">
          Find friends by username and manage your requests.
        </p>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username"
            className="pl-9"
          />
        </div>
      </header>

      <div className="space-y-6 p-4">
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
              <ul className="space-y-2">{searchResults.map(renderSearchResult)}</ul>
            )}
          </section>
        ) : (
          <>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading friends...</p>
            ) : (
              <>
                {incomingPending.length > 0 && (
                  <section>
                    <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Requests · {incomingPending.length}
                    </h2>

                    <ul className="space-y-2">{incomingPending.map(renderFriendItem)}</ul>
                  </section>
                )}

                {accepted.length > 0 && (
                  <section>
                    <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Check className="h-3.5 w-3.5" />
                      Friends · {accepted.length}
                    </h2>

                    <ul className="space-y-2">{accepted.map(renderFriendItem)}</ul>
                  </section>
                )}

                {outgoingPending.length > 0 && (
                  <section>
                    <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Sent requests · {outgoingPending.length}
                    </h2>

                    <ul className="space-y-2">{outgoingPending.map(renderFriendItem)}</ul>
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
              They'll be removed from your friends list. You can add them back anytime.
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