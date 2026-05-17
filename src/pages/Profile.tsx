import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil, Check, UserPlus, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getPrivacy, listGroups, updatePrivacy } from "@/lib/api";
import { FriendGroup, PrivacySettings } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

type ProfileUser = {
  id: string;
  name: string;
  username: string;
  email: string;
};

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const authUser = session?.user;

        if (!authUser) {
          navigate("/", { replace: true });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profileError) {
          toast.error(profileError.message);
        }

        const fallbackName =
          authUser.user_metadata?.display_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split("@")[0] ||
          "User";

        const fallbackUsername =
          authUser.user_metadata?.username ||
          authUser.email?.split("@")[0] ||
          "user";

        const loadedUser: ProfileUser = {
          id: authUser.id,
          email: authUser.email ?? "",
          name: profile?.display_name ?? fallbackName,
          username: profile?.username ?? fallbackUsername,
        };

        if (!isMounted) return;

        setUser(loadedUser);
        setEditName(loadedUser.name);
        setEditUsername(loadedUser.username);

        const [loadedGroups, loadedPrivacy] = await Promise.all([
          listGroups(),
          getPrivacy(),
        ]);

        if (!isMounted) return;

        setGroups(loadedGroups);
        setPrivacy(loadedPrivacy);
      } catch (error) {
        console.error(error);
        toast.error("Could not load profile");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const update = async (patch: Partial<PrivacySettings>) => {
    const next = await updatePrivacy(patch);
    setPrivacy(next);
  };

  const saveProfile = async () => {
    if (!user) return;

    const cleanName = editName.trim();
    const cleanUsername = editUsername.trim().toLowerCase();

    if (!cleanName || !cleanUsername) {
      toast.error("Display name and username are required");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: cleanName,
        username: cleanUsername,
      })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    const updatedUser = {
      ...user,
      name: cleanName,
      username: cleanUsername,
    };

    setUser(updatedUser);
    setEditing(false);
    toast.success("Profile updated");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    localStorage.clear();
    sessionStorage.clear();

    toast.success("Signed out");
    navigate("/", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  if (!user || !privacy) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Could not load your profile.
        </p>

        <button
          onClick={() => navigate("/feed")}
          className="rounded-full bg-[#DA2C43] px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-full overflow-x-hidden bg-muted/20">
      <header className="safe-top sticky top-0 z-30 border-b border-border/70 bg-background/95 px-4 py-4 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Profile<span className="text-[#DA2C43]">.</span>
        </h1>
      </header>

      <section className="flex items-center gap-4 p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary">
          {initials}
        </div>

        {editing ? (
          <div className="flex-1 space-y-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Display name"
              className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
            />

            <Input
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="Username"
              className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
            />

            <button
              onClick={saveProfile}
              className="inline-flex items-center gap-1 rounded-full bg-[#DA2C43] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#c9273c]"
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-semibold">{user.name}</p>

              <button
                onClick={() => setEditing(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft/70 hover:text-primary"
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            <p className="truncate text-sm text-muted-foreground">
              @{user.username}
            </p>

            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        )}
      </section>

      <section className="px-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Social
        </h2>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <button
            onClick={() => navigate("/friends")}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-primary-soft/70 hover:text-primary"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              Manage friends
            </span>

            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Default group
        </h2>

        <div className="space-y-2">
          {groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
              No groups yet.
            </div>
          ) : (
            groups.map((g) => {
              const active = g.id === privacy.defaultGroupId;

              return (
                <button
                  key={g.id}
                  onClick={() => update({ defaultGroupId: g.id })}
                  className={cn(
                    "flex w-full items-center justify-between rounded-3xl border-2 p-3 text-left shadow-sm transition-colors",
                    active
                      ? "border-[#DA2C43] bg-[#DA2C43]/10"
                      : "border-border bg-card hover:bg-primary-soft/70 hover:text-primary",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-lg">{g.emoji}</span>
                    {g.name}
                  </span>

                  {active && (
                    <span className="rounded-full bg-[#DA2C43] px-2 py-0.5 text-xs font-semibold text-white">
                      Default
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Privacy
        </h2>

        <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-semibold">Read receipts</p>
              <p className="text-xs text-muted-foreground">
                Let friends see when you've seen their post
              </p>
            </div>

            <Switch
              checked={privacy.shareReadReceipts}
              onCheckedChange={(v) => update({ shareReadReceipts: v })}
              className="data-[state=checked]:bg-[#DA2C43]"
            />
          </div>

          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                Pings when friends are down
              </p>
            </div>

            <Switch
              checked={privacy.allowNotifications}
              onCheckedChange={(v) => update({ allowNotifications: v })}
              className="data-[state=checked]:bg-[#DA2C43]"
            />
          </div>
        </div>
      </section>

      <section className="mt-6 px-5 pb-28">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-primary-soft/70 hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </section>
    </div>
  );
}