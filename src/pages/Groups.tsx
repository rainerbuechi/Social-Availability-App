import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageCircle } from "lucide-react";
import { listGroups, listUsers, createGroup, updateGroup, deleteGroup, groupHasPosts, getLatestChatMessage, listAcceptedFriends } from "@/lib/api";
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

const EMOJI_OPTIONS = ["💛", "📚", "💪", "🌎", "🎉", "☕", "🏠", "🎮", "🍕", "🔥"];

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [latestMessages, setLatestMessages] = useState<Record<string, ChatMessage>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FriendGroup | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmoji, setFormEmoji] = useState("💛");
  const [formMembers, setFormMembers] = useState<string[]>([]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FriendGroup | null>(null);
  const [deleteHasPosts, setDeleteHasPosts] = useState(false);

  const refresh = async () => {
    const [gs, us, fr] = await Promise.all([listGroups(), listUsers(), listAcceptedFriends()]);
    setGroups(gs);
    setUsers(us);
    setFriends(fr);
    // Load latest messages for each group
    const msgs: Record<string, ChatMessage> = {};
    for (const g of gs) {
      const m = await getLatestChatMessage(g.id);
      if (m) msgs[g.id] = m;
    }
    setLatestMessages(msgs);
  };

  useEffect(() => { refresh(); }, []);

  const userById = (id: string) => users.find((u) => u.id === id);
  const availableMembers = friends;

  const openCreate = () => {
    setEditingGroup(null);
    setFormName("");
    setFormEmoji("💛");
    setFormMembers([]);
    setDialogOpen(true);
  };

  const openEdit = (g: FriendGroup) => {
    setEditingGroup(g);
    setFormName(g.name);
    setFormEmoji(g.emoji);
    setFormMembers([...g.memberIds]);
    setDialogOpen(true);
  };

  const toggleMember = (id: string) => {
    setFormMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (editingGroup) {
      await updateGroup(editingGroup.id, {
        name: formName.trim(),
        emoji: formEmoji,
        memberIds: formMembers,
      });
      toast.success("Group updated");
    } else {
      await createGroup({
        name: formName.trim(),
        emoji: formEmoji,
        memberIds: formMembers,
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
    <div>
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <button
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose who sees what you're up to.
        </p>
      </header>

      <ul className="space-y-3 p-4">
        {groups.map((g) => {
          const latest = latestMessages[g.id];
          const latestAuthor = latest ? userById(latest.authorId) : undefined;

          return (
            <li
              key={g.id}
              className="rounded-2xl border border-border bg-card p-4 cursor-pointer"
              onClick={() => navigate(`/groups/${g.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-xl">
                    {g.emoji}
                  </div>
                  <div>
                    <p className="text-base font-semibold">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.memberIds.length} member{g.memberIds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/groups/${g.id}/chat`); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                    aria-label="Group chat"
                  >
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(g); }}
                    className="text-sm text-primary font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(g); }}
                    className="text-sm text-destructive font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Latest activity preview */}
              {latest && (
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  💬 {latestAuthor?.name ?? "Someone"}: {latest.body} · {relTime(latest.createdAt)}
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
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-medium text-secondary-foreground"
                      title={u?.name}
                    >
                      {initials}
                    </div>
                  );
                })}
                {g.memberIds.length > 6 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
                    +{g.memberIds.length - 6}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit group" : "New group"}</DialogTitle>
            <DialogDescription>
              {editingGroup ? "Update this group's details." : "Create a group to share availability with."}
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
              />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setFormEmoji(e)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xl transition",
                      e === formEmoji
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-card hover:border-foreground/20"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {availableMembers.map((u) => {
                  const selected = formMembers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleMember(u.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                        selected
                          ? "bg-primary-soft text-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border-2 flex items-center justify-center",
                        selected ? "border-primary bg-primary" : "border-border"
                      )}>
                        {selected && <span className="text-[10px] text-primary-foreground">✓</span>}
                      </div>
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full rounded-full">
              {editingGroup ? "Save changes" : "Create group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteHasPosts
                ? "This group has existing posts. Deleting it will leave those posts without a group. Are you sure?"
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
