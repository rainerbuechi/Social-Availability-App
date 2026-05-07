import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Calendar, Clock, ChevronRight, Trash2 } from "lucide-react";
import {
  listPools,
  joinPool,
  leavePool,
  isInPool,
  deletePool,
  getCurrentUser,
  listGroups,
  createPool,
} from "@/lib/api";
import { WaitingPool, FriendGroup, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function formatPoolDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function Pool() {
  const navigate = useNavigate();
  const [pools, setPools] = useState<WaitingPool[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [minPeople, setMinPeople] = useState(3);
  const [groupId, setGroupId] = useState("");

  const refresh = useCallback(async () => {
    const [allPools, user, allGroups] = await Promise.all([
      listPools(),
      getCurrentUser(),
      listGroups(),
    ]);
    setPools(allPools);
    setMe(user);
    setGroups(allGroups);
    if (allGroups.length > 0 && !groupId) setGroupId(allGroups[0].id);

    const joinedMap: Record<string, boolean> = {};
    for (const p of allPools) {
      joinedMap[p.id] = await isInPool(p.id);
    }
    setJoined(joinedMap);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleJoin = async (poolId: string) => {
    await joinPool(poolId);
    toast.success("You're in the pool!");
    refresh();
  };

  const handleLeave = async (poolId: string) => {
    await leavePool(poolId);
    toast("Left the pool");
    refresh();
  };

  const handleDelete = async (poolId: string) => {
    await deletePool(poolId);
    toast("Pool deleted");
    refresh();
  };

  const handleCreate = async () => {
    if (!title.trim() || !date || !groupId) {
      toast.error("Add a title, date, and group");
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

  return (
    <div>
      {/* Header */}
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Pool<span className="text-primary"> 🏊</span>
          </h1>
          <Button
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            {showCreate ? "Cancel" : "New Pool"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Say you're free — let the crew gather
        </p>
      </header>

      {/* Create form */}
      {showCreate && (
        <div className="m-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="font-semibold text-sm">Create a waiting pool</p>

          <Input
            placeholder="Title — e.g. Down for anything Saturday 🤙"
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min people to chat</label>
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
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">To (optional)</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {groups.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Visible to</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button className="w-full" onClick={handleCreate}>
            Create Pool
          </Button>
        </div>
      )}

      {/* Pool list */}
      <div className="space-y-3 p-4">
        {pools.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            No pools yet. Create one and see who's down 👀
          </div>
        ) : (
          pools.map((pool) => {
            const isOwn = pool.authorId === me?.id;
            const inPool = joined[pool.id] ?? false;
            const ready = pool.memberIds.length >= pool.minPeople;

            return (
              <div
                key={pool.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{pool.title}</p>
                    {pool.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{pool.description}</p>
                    )}
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(pool.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatPoolDate(pool.date)}
                  </span>
                  {pool.startTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {pool.startTime}{pool.endTime ? ` – ${pool.endTime}` : ""}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {pool.memberIds.length}/{pool.minPeople} in
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        (pool.memberIds.length / pool.minPeople) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {inPool ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleLeave(pool.id)}
                    >
                      Leave
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleJoin(pool.id)}
                    >
                      I'm down
                    </Button>
                  )}

                  {ready && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-primary border-primary"
                      onClick={() => navigate(`/groups`)}
                    >
                      Chat <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {ready && (
                  <p className="text-xs text-center text-primary font-medium">
                    🎉 Enough people! Start chatting to decide what to do.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}