import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  getPool,
  listPoolMembers,
  getCurrentUser,
  joinPool,
  leavePool,
  isInPool,
  updatePool,
} from "@/lib/api";
import { WaitingPool, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function PoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();

  const [pool, setPool] = useState<WaitingPool | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [me, setMe] = useState<User | null>(null);
  const [inPool, setInPool] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editMin, setEditMin] = useState(3);

  const refresh = useCallback(async () => {
    if (!poolId) return;

    const [p, user, participating] = await Promise.all([
      getPool(poolId),
      getCurrentUser(),
      isInPool(poolId),
    ]);

    if (!p) {
      navigate(-1);
      return;
    }

    setPool(p);
    setMe(user);
    setInPool(participating);

    const poolMembers = await listPoolMembers(poolId);
    setMembers(poolMembers);
  }, [poolId, navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startEdit = () => {
    if (!pool) return;

    setEditTitle(pool.title);
    setEditDesc(pool.description ?? "");
    setEditDate(pool.date);
    setEditStart(pool.startTime ?? "");
    setEditEnd(pool.endTime ?? "");
    setEditMin(pool.minPeople);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!poolId || !editTitle.trim() || !editDate) {
      toast.error("Title and date are required");
      return;
    }

    await updatePool(poolId, {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
      date: editDate,
      startTime: editStart || undefined,
      endTime: editEnd || undefined,
      minPeople: editMin,
    });

    toast.success("Pool updated!");
    setEditing(false);
    refresh();
  };

  const handleJoin = async () => {
    if (!poolId) return;

    await joinPool(poolId);
    toast.success("You're in!");
    refresh();
  };

  const handleLeave = async () => {
    if (!poolId) return;

    await leavePool(poolId);
    toast("Left the pool");
    refresh();
  };

  if (!pool) return null;

  const isOwn = pool.authorId === me?.id;
  const ready = pool.memberIds.length >= pool.minPeople;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      <header className="safe-top shrink-0 border-b border-border bg-background/90 px-5 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="flex-1 truncate text-lg font-bold">
            {pool.title}
          </h1>

          {isOwn && !editing && (
            <button
              onClick={startEdit}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Edit pool"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}

          {editing && (
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4" />
              </button>

              <button
                onClick={handleSave}
                className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-soft"
                aria-label="Save pool"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 pb-28">
        {editing ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
              className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
            />

            <Input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description (optional)"
              className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Date
                </label>

                <Input
                  type="date"
                  min={todayStr()}
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
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
                  value={editMin}
                  onChange={(e) => setEditMin(Number(e.target.value))}
                  className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  From
                </label>

                <Input
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  To
                </label>

                <Input
                  type="time"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
                />
              </div>
            </div>

            <Button
              className="h-11 w-full rounded-full bg-[#DA2C43] font-semibold text-white hover:bg-[#c9273c]"
              onClick={handleSave}
            >
              Save changes
            </Button>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            {pool.description && (
              <p className="text-sm text-muted-foreground">
                {pool.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatPoolDate(pool.date)}
              </span>

              {pool.startTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {pool.startTime}
                  {pool.endTime ? ` – ${pool.endTime}` : ""}
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {pool.memberIds.length} / {pool.minPeople} needed
              </span>
            </div>

            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
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

            {ready && (
              <p className="pt-1 text-center text-xs font-medium text-[#DA2C43]">
                🎉 Threshold reached — open the group chat to decide what to do!
              </p>
            )}
          </div>
        )}

        {!editing &&
          (inPool ? (
            <Button
              variant="outline"
              className="h-11 w-full rounded-full border-border bg-card hover:bg-primary-soft/70 hover:text-primary"
              onClick={handleLeave}
            >
              Leave pool
            </Button>
          ) : (
            <Button
              className="h-11 w-full rounded-full bg-[#DA2C43] font-semibold text-white hover:bg-[#c9273c]"
              onClick={handleJoin}
            >
              I'm down 🙋
            </Button>
          ))}

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Who's in ({members.length})
          </p>

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one yet — be the first!
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const initials = member.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        @{member.username}
                      </p>
                    </div>

                    {member.id === pool.authorId && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        creator
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}