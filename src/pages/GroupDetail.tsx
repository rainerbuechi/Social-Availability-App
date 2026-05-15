import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  ChevronRight,
  Plus,
  Users,
  Calendar,
  Clock,
  Trash2,
  Waves,
} from "lucide-react";
import {
  getGroup,
  listGroupMembers,
  listPostsByGroup,
  getRecentMessagesForGroup,
  getUser,
  createPool,
  deletePool,
  joinPool,
  leavePool,
  isInPool,
  listPoolsByGroup,
  getCurrentUser,
  listGroupSuggestions,
} from "@/lib/api";
import {
  AvailabilityPost,
  ChatMessage,
  FriendGroup,
  GroupSuggestion,
  User,
  WaitingPool,
} from "@/lib/types";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function formatPoolDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

const todayStr = () => new Date().toISOString().split("T")[0];

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<FriendGroup | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [posts, setPosts] = useState<AvailabilityPost[]>([]);
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([]);
  const [messageAuthors, setMessageAuthors] = useState<Record<string, string>>({});
  const [pools, setPools] = useState<WaitingPool[]>([]);
  const [poolJoined, setPoolJoined] = useState<Record<string, boolean>>({});
  const [me, setMe] = useState<User | null>(null);
  const [suggestions, setSuggestions] = useState<GroupSuggestion[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [minPeople, setMinPeople] = useState(3);

  const refresh = async () => {
    if (!groupId) return;

    const [g, m, p, msgs, allPools, user, sugs] = await Promise.all([
      getGroup(groupId),
      listGroupMembers(groupId),
      listPostsByGroup(groupId),
      getRecentMessagesForGroup(groupId, 3),
      listPoolsByGroup(groupId),
      getCurrentUser(),
      listGroupSuggestions(groupId),
    ]);

    if (!g) {
      navigate("/groups");
      return;
    }

    setGroup(g);
    setMembers(m);
    setPosts(p);
    setRecentMessages(msgs);
    setPools(allPools);
    setMe(user);
    setSuggestions(sugs);

    const authorMap: Record<string, string> = {};

    for (const msg of msgs) {
      if (!authorMap[msg.authorId]) {
        const u = await getUser(msg.authorId);
        authorMap[msg.authorId] = u?.name ?? "?";
      }
    }

    setMessageAuthors(authorMap);

    const joinedMap: Record<string, boolean> = {};

    for (const pool of allPools) {
      joinedMap[pool.id] = await isInPool(pool.id);
    }

    setPoolJoined(joinedMap);
  };

  useEffect(() => {
    refresh();
  }, [groupId]);

  const handleCreatePool = async () => {
    if (!title.trim() || !date || !groupId) {
      toast.error("Add a title and date");
      return;
    }

    await createPool({
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      visibleToGroupId: groupId,
      minPeople,
    });

    toast.success("Pool created!");
    setShowCreate(false);
    setTitle("");
    setDescription("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setMinPeople(3);
    refresh();
  };

  const handleJoin = async (poolId: string) => {
    await joinPool(poolId);
    toast.success("You're in!");
    refresh();
  };

  const handleLeave = async (poolId: string) => {
    await leavePool(poolId);
    toast("Left the pool");
    refresh();
  };

  const handleDeletePool = async (poolId: string) => {
    await deletePool(poolId);
    toast("Pool deleted");
    refresh();
  };

  if (!group) return null;

  return (
    <div className="min-h-full space-y-4 overflow-x-hidden bg-muted/20 p-4 pb-24">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/groups")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft/70 hover:text-primary"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="ml-3 flex-1">
          <h1 className="text-xl font-extrabold tracking-tight">
            {group.emoji} {group.name}
          </h1>
          <p className="text-xs text-muted-foreground">{members.length} members</p>
        </div>

        <button
          onClick={() => navigate(`/groups/${groupId}/chat`)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft/70 hover:text-primary"
          aria-label="Group chat"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Members
        </p>

        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const initials = m.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={m.id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm shadow-sm"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                  {initials}
                </div>
                {m.name}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Waves className="h-3.5 w-3.5" />
            Waiting Pools
          </p>

          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1 rounded-full bg-[#DA2C43] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#c9273c]"
          >
            <Plus className="h-3.5 w-3.5" />
            {showCreate ? "Cancel" : "New Pool"}
          </button>
        </div>

        {showCreate && (
          <div className="mb-3 space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
            <Input
              placeholder='e.g. "Down for anything Saturday 🤙"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
            />

            <Input
              placeholder="Vibe / description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Date *
                </label>

                <Input
                  type="date"
                  min={todayStr()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Min people
                </label>

                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={minPeople}
                  onChange={(e) => setMinPeople(Number(e.target.value))}
                  className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  From (optional)
                </label>

                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  To (optional)
                </label>

                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
                />
              </div>
            </div>

            <Button
              className="h-11 w-full rounded-full bg-[#DA2C43] font-semibold text-white hover:bg-[#c9273c]"
              onClick={handleCreatePool}
            >
              Create Pool
            </Button>
          </div>
        )}

        {pools.length === 0 && !showCreate ? (
          <p className="rounded-3xl border border-dashed border-[#DA2C43]/30 bg-card p-4 text-sm text-muted-foreground shadow-sm">
            No pools yet — create one to see who's free.
          </p>
        ) : (
          <div className="space-y-2">
            {pools.map((pool) => {
              const isOwn = pool.authorId === me?.id;
              const inPool = poolJoined[pool.id] ?? false;
              const ready = pool.memberIds.length >= pool.minPeople;

              return (
                <div
                  key={pool.id}
                  className="cursor-pointer space-y-2 rounded-3xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-primary-soft/70"
                  onClick={() => navigate(`/pools/${pool.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{pool.title}</p>

                      {pool.description && (
                        <p className="text-xs text-muted-foreground">
                          {pool.description}
                        </p>
                      )}
                    </div>

                    {isOwn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePool(pool.id);
                        }}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Delete pool"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatPoolDate(pool.date)}
                    </span>

                    {pool.startTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pool.startTime}
                        {pool.endTime ? ` – ${pool.endTime}` : ""}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {pool.memberIds.length}/{pool.minPeople} in
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#DA2C43] transition-all"
                      style={{
                        width: `${Math.min(
                          (pool.memberIds.length / pool.minPeople) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {inPool ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-full border-border bg-card hover:bg-primary-soft/70 hover:text-primary"
                        onClick={() => handleLeave(pool.id)}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 rounded-full bg-[#DA2C43] text-white hover:bg-[#c9273c]"
                        onClick={() => handleJoin(pool.id)}
                      >
                        I'm down
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 rounded-full text-muted-foreground hover:bg-primary-soft/70 hover:text-primary"
                      onClick={() => navigate(`/pools/${pool.id}`)}
                    >
                      Details <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {ready && (
                    <p className="text-center text-xs font-semibold text-[#DA2C43]">
                      🎉 Enough people — open chat to decide what to do!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ✨ Suggestions
          </p>

          <div className="space-y-2">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="flex items-start justify-between gap-2 rounded-3xl border border-border bg-card px-3 py-2.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.cardTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.cardArea} · {s.cardType}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card
        className="cursor-pointer rounded-3xl border-border bg-card shadow-sm transition-colors hover:bg-primary-soft/70"
        onClick={() => navigate(`/groups/${groupId}/chat`)}
      >
        <CardHeader className="px-4 pb-1 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Chat</CardTitle>

            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              View all <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-3">
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the chat.
            </p>
          ) : (
            <div className="space-y-1">
              {recentMessages.map((msg) => (
                <p key={msg.id} className="truncate text-sm">
                  <span className="font-medium">
                    {messageAuthors[msg.authorId] ?? "?"}:{" "}
                  </span>
                  {msg.body}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent Activity
        </p>

        {posts.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
            No posts in this group yet.
          </p>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onDeleted={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}