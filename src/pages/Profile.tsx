import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Pencil,
  Check,
  UserPlus,
  ChevronRight,
  Copy,
  Share2,
  QrCode,
  Camera,
  Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getPrivacy, updatePrivacy } from "@/lib/api";
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
} from "@/lib/notifications";
import { PrivacySettings } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

type ProfileUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  inviteCode: string;
  avatarUrl: string | null;
};

type InvitedPerson = {
  id: string;
  display_name: string;
  username: string;
};

const NOTIFICATION_PREFS: {
  key: keyof PrivacySettings;
  label: string;
  desc: string;
}[] = [
  {
    key: "notifyNewPost",
    label: "New activity from friends",
    desc: "When someone posts they're free",
  },
  {
    key: "notifyGroupMessage",
    label: "Group chat messages",
    desc: "Includes a preview of the message",
  },
  {
    key: "notifyJoinedActivity",
    label: "Someone joins your activity or pool",
    desc: "When friends respond to your post or pool",
  },
  {
    key: "notifyNewPool",
    label: "New waiting pool in your groups",
    desc: "When someone opens a pool you might want to join",
  },
  {
    key: "notifyFriendRequest",
    label: "Friend requests",
    desc: "When someone wants to add you as a friend",
  },
];

async function resizeAvatar(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const maxSize = 512;
    const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not resize image");
    }

    ctx.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress image"));
            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        0.82,
      );
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function Profile() {
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [invitedPeople, setInvitedPeople] = useState<InvitedPerson[]>([]);

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
          .select("id, username, display_name, invite_code, avatar_url")
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
          inviteCode: profile?.invite_code ?? "",
          avatarUrl: profile?.avatar_url ?? null,
        };

        if (!isMounted) return;

        setUser(loadedUser);
        setEditName(loadedUser.name);
        setEditUsername(loadedUser.username);

        const [loadedPrivacy, pendingRequestsResult, referralsResult] =
          await Promise.all([
            getPrivacy(),
            supabase
              .from("friendships")
              .select("id", { count: "exact", head: true })
              .eq("to_id", authUser.id)
              .eq("status", "pending"),
            supabase
              .from("referrals")
              .select("invitee_id, created_at")
              .eq("inviter_id", authUser.id)
              .order("created_at", { ascending: false }),
          ]);

        if (!isMounted) return;

        if (pendingRequestsResult.error) {
          console.error(pendingRequestsResult.error);
        }

        setPrivacy(loadedPrivacy);
        setPendingFriendRequests(pendingRequestsResult.count ?? 0);

        if (referralsResult.error) {
          console.error(referralsResult.error);
        } else {
          const inviteeIds = Array.from(
            new Set((referralsResult.data ?? []).map((row) => row.invitee_id)),
          );

          if (inviteeIds.length > 0) {
            const { data: inviteeProfiles, error: inviteeProfilesError } =
              await supabase
                .from("profiles")
                .select("id, display_name, username")
                .in("id", inviteeIds);

            if (inviteeProfilesError) {
              console.error(inviteeProfilesError);
            } else if (isMounted) {
              setInvitedPeople((inviteeProfiles ?? []) as InvitedPerson[]);
            }
          } else {
            setInvitedPeople([]);
          }
        }
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

  const inviteLink = useMemo(() => {
    if (!user?.inviteCode) return "";
    
    const appUrl =
      import.meta.env.VITE_PUBLIC_APP_URL || "https://down-app.ch";

    return `${appUrl.replace(/\/$/, "")}/invite/${user.inviteCode}`;

  }, [user?.inviteCode]);

  const update = async (patch: Partial<PrivacySettings>) => {
    const next = await updatePrivacy(patch);
    setPrivacy(next);
  };

  const handleAvatarPick = () => {
    if (avatarUploading) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image is too large. Please choose one under 8 MB.");
      return;
    }

    setAvatarUploading(true);

    try {
      const resized = await resizeAvatar(file);
      const filePath = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, resized, {
          contentType: "image/jpeg",
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (profileError) {
        toast.error(profileError.message);
        return;
      }

      setUser({ ...user, avatarUrl });
      toast.success("Profile picture updated");
    } catch (error) {
      console.error(error);
      toast.error("Could not upload profile picture");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;

    await navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied");
  };

  const handleShareInvite = async () => {
    if (!inviteLink) return;

    const shareData = {
      title: "Join me on Down",
      text: "Add me on Down and see when I’m free.",
      url: inviteLink,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied");
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (!user) return;

    if (enabled) {
      if (!isPushSupported()) {
        toast.error("Push notifications aren't supported on this browser");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        toast.error(
          "Notifications blocked — go to your OS Settings and allow notifications for this app, then try again",
        );
        return;
      }

      setNotifLoading(true);
      const success = await subscribeToPush(user.id);
      setNotifLoading(false);

      if (!success) {
        toast.error("Could not set up notifications — please try again");
        return;
      }

      await update({ allowNotifications: true });
      toast.success("Notifications enabled 🔔");
    } else {
      setNotifLoading(true);
      await unsubscribeFromPush(user.id);
      setNotifLoading(false);
      await update({ allowNotifications: false });
      toast("Notifications turned off");
    }
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

    setUser({
      ...user,
      name: cleanName,
      username: cleanUsername,
    });

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
      <div className="flex h-full flex-col overflow-hidden bg-muted/20">
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!user || !privacy) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-muted/20">
        <div className="no-scrollbar flex flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-6 text-center">
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
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const requestBadgeText =
    pendingFriendRequests > 9 ? "9+" : String(pendingFriendRequests);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      <header className="safe-top shrink-0 border-b border-border/70 bg-background/95 px-4 py-4 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Profile<span className="text-[#DA2C43]">.</span>
        </h1>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden pb-28">
        <section className="flex items-center gap-4 p-5">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleAvatarPick}
              className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-xl font-semibold text-primary"
              aria-label="Change profile picture"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}

              <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                {avatarUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={handleAvatarPick}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-[#DA2C43] text-white shadow-sm"
              aria-label="Upload profile picture"
            >
              {avatarUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
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
              <span className="flex min-w-0 items-center gap-2">
                <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />

                <span className="truncate">Manage friends</span>

                {pendingFriendRequests > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#DA2C43] px-1.5 text-[11px] font-bold leading-none text-white shadow-sm">
                    {requestBadgeText}
                  </span>
                )}
              </span>

              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </section>

        <section className="mt-6 px-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Invite friends
          </h2>

          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[#DA2C43]" />

              <p className="text-sm font-semibold">Your personal invite</p>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Share this QR code or link. New users who sign up through it are
              tracked here.
            </p>

            <div className="mt-4 flex justify-center">
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                {inviteLink ? (
                  <QRCodeSVG value={inviteLink} size={160} />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center text-xs text-muted-foreground">
                    No invite code
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background px-3 py-2">
              <p className="truncate text-xs text-muted-foreground">
                {inviteLink}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyInvite}
                className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-background text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary-soft/70 hover:text-primary"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>

              <button
                onClick={handleShareInvite}
                className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#DA2C43] text-sm font-semibold text-white transition-colors hover:bg-[#c9273c]"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-muted/50 p-3">
              <p className="text-sm font-semibold">
                {invitedPeople.length} invited{" "}
                {invitedPeople.length === 1 ? "person" : "people"}
              </p>

              {invitedPeople.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {invitedPeople.slice(0, 3).map((person) => (
                    <p
                      key={person.id}
                      className="truncate text-xs text-muted-foreground"
                    >
                      {person.display_name} · @{person.username}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  No one has joined through your invite yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 px-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Privacy
          </h2>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
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

            <div className="flex items-center justify-between gap-4 border-t border-border p-4">
              <div>
                <p className="text-sm font-semibold">Notifications</p>

                <p className="text-xs text-muted-foreground">
                  {notifLoading
                    ? "Updating…"
                    : privacy.allowNotifications
                      ? "Tap a type below to customise"
                      : "Enable to get pinged when things happen"}
                </p>
              </div>

              <Switch
                checked={privacy.allowNotifications}
                disabled={notifLoading}
                onCheckedChange={handleNotificationsToggle}
                className="data-[state=checked]:bg-[#DA2C43]"
              />
            </div>

            {privacy.allowNotifications && (
              <div className="border-t border-border bg-muted/30">
                {NOTIFICATION_PREFS.map(({ key, label, desc }, i) => (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between gap-4 px-4 py-3 pl-7",
                      i < NOTIFICATION_PREFS.length - 1 &&
                        "border-b border-border/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{label}</p>

                      <p className="text-[11px] text-muted-foreground">
                        {desc}
                      </p>
                    </div>

                    <Switch
                      checked={privacy[key] as boolean}
                      onCheckedChange={(v) => update({ [key]: v })}
                      className="scale-90 data-[state=checked]:bg-[#DA2C43]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 px-5 pb-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-primary-soft/70 hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}