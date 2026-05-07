import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, ChevronRight, Plus, Users, Calendar, Clock, Trash2, Waves } from "lucide-react";
import {
  getGroup, listGroupMembers, listPostsByGroup,
  getRecentMessagesForGroup, getUser,
  createPool, deletePool, joinPool, leavePool,
  isInPool, listPoolsByGroup, getCurrentUser,
  listGroupSuggestions,
} from "@/lib/api";
import { AvailabilityPost, ChatMessage, FriendGroup, GroupSuggestion, User, WaitingPool } from "@/lib/types";
import { relativeTime } from "@/lib/status";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function formatPoolDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
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
  

  // create pool form
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
    if (!g) { navigate("/groups"); return; }
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

  useEffect(() => { refresh(); }, [groupId]);

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
    setTitle(""); setDescription(""); setDate("");
    setStartTime(""); setEndTime(""); setMinPeople(3);
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
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/groups")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 ml-3">
          <h1 className="text-xl font-bold">{group.emoji} {group.name}</h1>
          <p className="text-xs text-muted-foreground">{members.length} members</p>
        </div>
        <button onClick={() => navigate(`/groups/${groupId}/chat`)} className="text-muted-foreground hover:text-foreground">
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Members */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Members</p>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const initials = m.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={m.id} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                  {initials}
                </div>
                {m.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* Waiting Pools */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Waves className="h-3.5 w-3.5" /> Waiting Pools
          </p>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            {showCreate ? "Cancel" : "New Pool"}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3 mb-3">
            <Input
              placeholder='e.g. "Down for anything Saturday 🤙"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Vibe / description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date *</label>
                <Input
                  type="date"
                  min={todayStr()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min people</label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={minPeople}
                  onChange={(e) => setMinPeople(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From (optional)</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">To (optional)</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreatePool}>Create Pool</Button>
          </div>
        )}

        {/* Pool cards */}
        {pools.length === 0 && !showCreate ? (
          <p className="text-sm text-muted-foreground py-2">No pools yet — create one to see who's free.</p>
        ) : (
          <div className="space-y-2">
            {pools.map((pool) => {
              const isOwn = pool.authorId === me?.id;
              const inPool = poolJoined[pool.id] ?? false;
              const ready = pool.memberIds.length >= pool.minPeople;
              return (
                <div
                  key={pool.id}
                  className="rounded-2xl border border-border bg-card p-3 space-y-2 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => navigate(`/pools/${pool.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{pool.title}</p>
                      {pool.description && (
                        <p className="text-xs text-muted-foreground">{pool.description}</p>
                      )}
                    </div>
                    {isOwn && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePool(pool.id); }}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{formatPoolDate(pool.date)}
                    </span>
                    {pool.startTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{pool.startTime}{pool.endTime ? ` – ${pool.endTime}` : ""}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />{pool.memberIds.length}/{pool.minPeople} in
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min((pool.memberIds.length / pool.minPeople) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {inPool ? (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleLeave(pool.id)}>
                        Leave
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1" onClick={() => handleJoin(pool.id)}>
                        I'm down
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={() => navigate(`/pools/${pool.id}`)}>
                      Details <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {ready && (
                    <p className="text-xs text-center text-primary font-medium">
                      🎉 Enough people — open chat to decide what to do!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Suggestions from Discover */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            ✨ Suggestions
          </p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card px-3 py-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.cardTitle}</p>
                  <p className="text-xs text-muted-foreground">{s.cardArea} · {s.cardType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat preview */}
      <Card className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => navigate(`/groups/${groupId}/chat`)}>
        <CardHeader className="pb-1 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Chat</CardTitle>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {recentMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Start the chat.</p>
          ) : (
            <div className="space-y-1">
              {recentMessages.map((msg) => (
                <p key={msg.id} className="text-sm truncate">
                  <span className="font-medium">{messageAuthors[msg.authorId] ?? "?"}: </span>
                  {msg.body}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent Activity</p>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts in this group yet.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => <PostCard key={p.id} post={p} onDeleted={refresh} />)}
          </div>
        )}
      </div>
    </div>
  );
}