import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil, Check } from "lucide-react";
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
import { FriendGroup, LocationPrecision, PrivacySettings, User } from "@/lib/types";
import { toast } from "sonner";

const PRECISIONS: { value: LocationPrecision; label: string }[] = [
  { value: "hidden", label: "Hidden" },
  { value: "approximate", label: "Approximate" },
  { value: "exact", label: "Exact" },
];

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
      if (!u) { navigate("/"); return; }
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
    const updated = await updateCurrentUser({ name: editName.trim(), username: editUsername.trim().toLowerCase() });
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
    <div>
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      </header>

      <section className="flex items-center gap-4 p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary">
          {initials}
        </div>
        {editing ? (
          <div className="flex-1 space-y-2">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Display name" />
            <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Username" />
            <button onClick={saveProfile} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              <Check className="h-4 w-4" /> Save
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold">{user.name}</p>
              <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}
      </section>

      <section className="px-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Default group
        </h2>
        <div className="space-y-2">
          {groups.map((g) => {
            const active = g.id === privacy.defaultGroupId;
            return (
              <button
                key={g.id}
                onClick={() => update({ defaultGroupId: g.id })}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition",
                  active ? "border-primary bg-primary-soft" : "border-border bg-card",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-lg">{g.emoji}</span>
                  {g.name}
                </span>
                {active && <span className="text-xs font-semibold text-primary">Default</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Default location precision
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {PRECISIONS.map((p) => {
            const active = p.value === privacy.defaultPrecision;
            return (
              <button
                key={p.value}
                onClick={() => update({ defaultPrecision: p.value })}
                className={cn(
                  "rounded-lg border-2 py-2 text-sm font-medium transition",
                  active ? "border-primary bg-primary-soft" : "border-border bg-card text-muted-foreground",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Privacy
        </h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">Read receipts</p>
              <p className="text-xs text-muted-foreground">Let friends see when you've seen their post</p>
            </div>
            <Switch checked={privacy.shareReadReceipts} onCheckedChange={(v) => update({ shareReadReceipts: v })} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">Pings when friends are down</p>
            </div>
            <Switch checked={privacy.allowNotifications} onCheckedChange={(v) => update({ allowNotifications: v })} />
          </div>
        </div>
      </section>

      <section className="mt-8 px-5 pb-8">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>
    </div>
  );
}
