import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  Trash2,
} from "lucide-react";
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

    if (allGroups.length > 0 && !groupId) {
      setGroupId(allGroups[0].id);
    }

    const joinedMap: Record<string, boolean> = {};

    for (const pool of allPools) {
      joinedMap[pool.id] = await isInPool(pool.id);
    }

    setJoined(joinedMap);
  }, [groupId]);

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
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      <header className="safe-top shrink-0 border-b border-border/70 bg-background/95 px-5 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              Pool<span className="text-[#DA2C43]"> 🏊</span>
            </h1>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              Say you're free — let the crew gather
            </p>
          </div>

          <Button
            size="sm"
            className="shrink-0 gap-1.5 rounded-full bg-[#DA2C43] text-white hover:bg-[#c9273c]"
            onClick={() => setShowCreate((value) => !value)}
          >
            <Plus className="h-4 w-4" />
            {showCreate ? "Cancel" : "New Pool"}
          </Button>
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden pb-28">
        {showCreate && (
          <div className="m-4 space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold">Create a waiting pool</p>

            <Input
              placeholder="Title — e.g. Down for anything Saturday 🤙"
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Min people to chat
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

            {groups.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Visible to
                </label>

                <select
                  className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DA2C43]"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.emoji} {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              className="h-11 w-full rounded-full bg-[#DA2C43] font-semibold text-white hover:bg-[#c9273c]"
              onClick={handleCreate}
            >
              Create Pool
            </Button>
          </div>
        )}

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
                  className="space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        {pool.title}
                      </p>

                      {pool.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {pool.description}
                        </p>
                      )}
                    </div>

                    {isOwn && (
                      <button
                        onClick={() => handleDelete(pool.id)}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Delete pool"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatPoolDate(pool.date)}
                    </span>

                    {pool.startTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {pool.startTime}
                        {pool.endTime ? ` – ${pool.endTime}` : ""}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
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

                  <div className="flex items-center gap-2">
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

                    {ready && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 rounded-full border-[#DA2C43] text-[#DA2C43] hover:bg-[#DA2C43]/10"
                        onClick={() => navigate("/groups")}
                      >
                        Chat <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {ready && (
                    <p className="text-center text-xs font-medium text-[#DA2C43]">
                      🎉 Enough people! Start chatting to decide what to do.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}