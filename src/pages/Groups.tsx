import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageCircle } from "lucide-react";
import {
  listGroups,
  listUsers,
  createGroup,
  updateGroup,
  deleteGroup,
  groupHasPosts,
  getLatestChatMessage,
  listAcceptedFriends,
  getCurrentUser,
} from "@/lib/api";
import { FriendGroup, User, ChatMessage } from "@/lib/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [latestMessages, setLatestMessages] = useState<Record<string, ChatMessage>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FriendGroup | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState("");
  const [formMembers, setFormMembers] = useState<string[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<FriendGroup | null>(null);
  const [deleteHasPosts, setDeleteHasPosts] = useState(false);
  const [meId, setMeId] = useState("");

  const refresh = async () => {
    const [gs, us, fr, me] = await Promise.all([
      listGroups(),
      listUsers(),
      listAcceptedFriends(),
      getCurrentUser(),
    ]);

    setGroups(gs);
    setUsers(us);
    setFriends(fr);
    if (me) setMeId(me.id);

    const msgs: Record<string, ChatMessage> = {};

    for (const g of gs) {
      const m = await getLatestChatMessage(g.id);
      if (m) msgs[g.id] = m;
    }

    setLatestMessages(msgs);
  };

  useEffect(() => {
    refresh();
  }, []);

  const userById = (id: string) => users.find((u) => u.id === id);
  const availableMembers = friends.filter((f) => f.id !== meId);

  const openCreate = () => {
    setEditingGroup(null);
    setFormName("");
    setFormEmoji("");
    setFormMembers(meId ? [meId] : []);
    setDialogOpen(true);
  };

  const openEdit = (g: FriendGroup) => {
    setEditingGroup(g);
    setFormName(g.name);
    setFormEmoji(g.emoji ?? "");
    setFormMembers([...g.memberIds]);
    setDialogOpen(true);
  };

  const toggleMember = (id: string) => {
    if (id === meId) return;
    setFormMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleEmojiChange = (value: string) => {
    const firstEmojiOrChar = Array.from(value).slice(0, 1).join("");
    setFormEmoji(firstEmojiOrChar);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Group name is required");
      return;
    }

    // Always ensure creator is included
    const members =
      meId && !formMembers.includes(meId)
        ? [meId, ...formMembers]
        : formMembers;

    if (editingGroup) {
      await updateGroup(editingGroup.id, {
        name: formName.trim(),
        emoji: formEmoji.trim(),
        memberIds: members,
      });
      toast.success("Group updated");
    } else {
      await createGroup({
        name: formName.trim(),
        emoji: formEmoji.trim(),
        memberIds: members,
      });
      toast.success("Group created");
    }

    setDialogOpen(false);
    refresh();
  };

  const handleDeleteClick = async (g: FriendGroup) => {
    const hasPosts = await groupHasPosts(g.id);
    setDeleteHasPosts(hasPosts);
    setDeleteTarget(g);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    await deleteGroup(deleteTarget.id);
    toast.success("Group deleted");
    setDeleteTarget(null);
    refresh();
  };

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;

    const hrs = Math.floor(mins / 60);

    if (hrs < 24) return `${hrs}h ago`;

    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-muted/20">
      <header className="safe-top sticky top-0 z-30 border-b border-border/70 bg-background/95 px-4 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              Groups<span className="text-[#DA2C43]">.</span>
            </h1>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              Choose who sees what you're up to.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#DA2C43] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c9273c]"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </header>

      <ul className="space-y-3 p-4 pb-24">
        {groups.length === 0 ? (
          <li className="rounded-3xl border border-dashed border-[#DA2C43]/30 bg-card p-6 text-center text-muted-foreground shadow-sm">
            <p>No groups yet.</p>

            <button
              onClick={openCreate}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#DA2C43] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c9273c]"
            >
              <Plus className="h-4 w-4" />
              Create group
            </button>
          </li>
        ) : (
          groups.map((g) => {
            const latest = latestMessages[g.id];
            const latestAuthor = latest ? userById(latest.authorId) : undefined;

            return (
              <li
                key={g.id}
                className="cursor-pointer rounded-3xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-primary-soft/70"
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">
                      {g.emoji || "–"}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">
                        {g.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {g.memberIds.length} member
                        {g.memberIds.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/groups/${g.id}/chat`);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-primary-soft hover:text-primary"
                      aria-label="Group chat"
                    >
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(g);
                      }}
                      className="rounded-full px-2 py-1 text-xs font-semibold text-[#DA2C43] transition-colors hover:bg-[#DA2C43]/10"
                    >
                      Edit
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(g);
                      }}
                      className="rounded-full px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {latest && (
                  <p className="mt-3 truncate rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    💬 {latestAuthor?.name ?? "Someone"}: {latest.body} ·{" "}
                    {relTime(latest.createdAt)}
                  </p>
                )}

                <div className="mt-3 flex -space-x-2">
                  {g.memberIds.slice(0, 6).map((id) => {
                    const u = userById(id);
                    const initials = u?.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("");

                    return (
                      <div
                        key={id}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-semibold text-secondary-foreground"
                        title={u?.name}
                      >
                        {initials}
                      </div>
                    );
                  })}

                  {g.memberIds.length > 6 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold text-muted-foreground">
                      +{g.memberIds.length - 6}
                    </div>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit group" : "New group"}
            </DialogTitle>

            <DialogDescription>
              {editingGroup
                ? "Update this group's details."
                : "Create a group to share availability with."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>

              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Study Squad"
                maxLength={30}
                className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
              />
            </div>

            <div className="space-y-2">
              <Label>Emoji</Label>

              <div className="flex gap-2">
                <Input
                  value={formEmoji}
                  onChange={(e) => handleEmojiChange(e.target.value)}
                  placeholder="Pick emoji"
                  className="h-11 rounded-2xl bg-card text-center text-xl focus-visible:ring-[#DA2C43]"
                />

                <button
                  type="button"
                  onClick={() => setFormEmoji("")}
                  className={cn(
                    "shrink-0 rounded-2xl border-2 px-3 text-sm font-semibold transition-colors",
                    formEmoji === ""
                      ? "border-[#DA2C43] bg-[#DA2C43]/10 text-[#DA2C43]"
                      : "border-border bg-card text-muted-foreground hover:bg-primary-soft/70 hover:text-primary",
                  )}
                >
                  None
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Tap the field and use your phone's emoji keyboard to pick any emoji.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Members</Label>

              <div className="max-h-40 space-y-1 overflow-y-auto">
                {/* Locked "You" row — always included */}
                {meId && (
                  <div className="flex w-full cursor-not-allowed items-center gap-2 rounded-2xl bg-[#DA2C43]/10 px-3 py-2 text-sm opacity-80">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-[#DA2C43] bg-[#DA2C43]">
                      <span className="text-[10px] text-white">✓</span>
                    </div>
                    <span className="text-foreground">You</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      always included
                    </span>
                  </div>
                )}

                {availableMembers.length === 0 ? (
                  <p className="rounded-2xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
                    No accepted friends yet.
                  </p>
                ) : (
                  availableMembers.map((u) => {
                    const selected = formMembers.includes(u.id);

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleMember(u.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors",
                          selected
                            ? "bg-[#DA2C43]/10 text-foreground"
                            : "text-muted-foreground hover:bg-primary-soft/70 hover:text-primary",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border-2",
                            selected
                              ? "border-[#DA2C43] bg-[#DA2C43]"
                              : "border-border",
                          )}
                        >
                          {selected && (
                            <span className="text-[10px] text-white">✓</span>
                          )}
                        </div>

                        {u.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="h-11 w-full rounded-full bg-[#DA2C43] font-semibold text-white hover:bg-[#c9273c]"
            >
              {editingGroup ? "Save changes" : "Create group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete "{deleteTarget?.name}"?
            </AlertDialogTitle>

            <AlertDialogDescription>
              {deleteHasPosts
                ? "This group has existing posts. Deleting it will leave those posts without a group. Are you sure?"
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}