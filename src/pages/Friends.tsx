import { useEffect, useState } from "react";
import { UserPlus, UserMinus, Clock, Check } from "lucide-react";
import {
  listUsers,
  getCurrentUser,
  listFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
} from "@/lib/api";
import { User, Friendship } from "@/lib/types";
import { toast } from "sonner";
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

export default function Friends() {
  const [users, setUsers] = useState<User[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [meId, setMeId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);

  const refresh = async () => {
    const [allUsers, me, fs] = await Promise.all([
      listUsers(),
      getCurrentUser(),
      listFriendships(),
    ]);
    setMeId(me.id);
    setUsers(allUsers.filter((u) => u.id !== me.id));
    setFriendships(fs);
  };

  useEffect(() => {
    refresh();
  }, []);

  const statusFor = (userId: string) =>
    friendships.find((f) => f.userId === userId)?.status ?? "none";

  const accepted = users.filter((u) => statusFor(u.id) === "accepted");
  const pending = users.filter((u) => statusFor(u.id) === "pending");
  const others = users.filter((u) => statusFor(u.id) === "none");

  const handleAdd = async (userId: string) => {
    await sendFriendRequest(userId);
    toast.success("Friend request sent");
    refresh();
  };

  const handleAccept = async (userId: string) => {
    await acceptFriendRequest(userId);
    toast.success("Friend added!");
    refresh();
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    await removeFriend(removeTarget.id);
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

  const renderUser = (u: User) => {
    const status = statusFor(u.id);
    return (
      <li
        key={u.id}
        className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
            {initials(u.name)}
          </div>
          <div>
            <p className="text-sm font-semibold">{u.name}</p>
            <p className="text-xs text-muted-foreground">@{u.username}</p>
          </div>
        </div>
        <div>
          {status === "accepted" && (
            <button
              onClick={() => setRemoveTarget(u)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <UserMinus className="h-3.5 w-3.5" /> Remove
            </button>
          )}
          {status === "pending" && (
            <button
              onClick={() => handleAccept(u.id)}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-primary-soft px-3 text-xs font-medium text-primary"
            >
              <Clock className="h-3.5 w-3.5" /> Accept
            </button>
          )}
          {status === "none" && (
            <button
              onClick={() => handleAdd(u.id)}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              <UserPlus className="h-3.5 w-3.5" /> Add
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage your friend list. Only friends can be added to groups.
        </p>
      </header>

      <div className="space-y-6 p-4">
        {accepted.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Check className="h-3.5 w-3.5" /> Friends · {accepted.length}
            </h2>
            <ul className="space-y-2">{accepted.map(renderUser)}</ul>
          </section>
        )}

        {pending.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Pending · {pending.length}
            </h2>
            <ul className="space-y-2">{pending.map(renderUser)}</ul>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suggested · {others.length}
            </h2>
            <ul className="space-y-2">{others.map(renderUser)}</ul>
          </section>
        )}
      </div>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removeTarget?.name}?
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
