import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil, Check, UserPlus, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getCurrentUser,
  getPrivacy,
  listGroups,
  updatePrivacy,
  updateCurrentUser,
  logoutLocal,
} from "@/lib/api";
import { FriendGroup, PrivacySettings, User } from "@/lib/types";
import { toast } from "sonner";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        navigate("/");
        return;
      }

      setUser(u);
      setEditName(u.name);
      setEditUsername(u.username);
    });

    listGroups().then(setGroups);
    getPrivacy().then(setPrivacy);
  }, [navigate]);

  const update = async (patch: Partial<PrivacySettings>) => {
    const next = await updatePrivacy(patch);
    setPrivacy(next);
  };

  const saveProfile = async () => {
    const updated = await updateCurrentUser({
      name: editName.trim(),
      username: editUsername.trim().toLowerCase(),
    });

    if (updated) {
      setUser(updated);
      toast.success("Profile updated");
    }

    setEditing(false);
  };

  const handleLogout = async () => {
    await logoutLocal();
    navigate("/");
  };

  if (!user || !privacy) return null;

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