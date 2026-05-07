import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Users, Pencil, Check, X } from "lucide-react";
import {
  getPool, listPoolMembers, getCurrentUser,
  joinPool, leavePool, isInPool, updatePool,
} from "@/lib/api";
import { WaitingPool, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function formatPoolDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
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

  // edit state
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
    if (!p) { navigate(-1); return; }
    setPool(p);
    setMe(user);
    setInPool(participating);
    const poolMembers = await listPoolMembers(poolId);
    setMembers(poolMembers);
  }, [poolId]);

  useEffect(() => { refresh(); }, [refresh]);

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
    <div>
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-bold truncate">{pool.title}</h1>
          {isOwn && !editing && (
            <button onClick={startEdit} className="text-muted-foreground hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {editing && (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <button onClick={handleSave} className="text-primary">
                <Check className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 space-y-5">
        {/* Edit form */}
        {editing ? (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
            <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description (optional)" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <Input type="date" min={todayStr()} value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min people</label>
                <Input type="number" min={2} max={20} value={editMin} onChange={(e) => setEditMin(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave}>Save changes</Button>
          </div>
        ) : (
          /* Details */
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            {pool.description && (
              <p className="text-sm text-muted-foreground">{pool.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />{formatPoolDate(pool.date)}
              </span>
              {pool.startTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />{pool.startTime}{pool.endTime ? ` – ${pool.endTime}` : ""}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />{pool.memberIds.length} / {pool.minPeople} needed
              </span>
            </div>

            {/* Progress */}
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((pool.memberIds.length / pool.minPeople) * 100, 100)}%` }}
              />
            </div>
            {ready && (
              <p className="text-xs text-primary font-medium text-center pt-1">
                🎉 Threshold reached — open the group chat to decide what to do!
              </p>
            )}
          </div>
        )}

        {/* Join / Leave */}
        {!editing && (
          inPool ? (
            <Button variant="outline" className="w-full" onClick={handleLeave}>Leave pool</Button>
          ) : (
            <Button className="w-full" onClick={handleJoin}>I'm down 🙋</Button>
          )
        )}

        {/* Who's in */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Who's in ({members.length})
          </p>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one yet — be the first!</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const initials = member.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div key={member.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">@{member.username}</p>
                    </div>
                    {member.id === pool.authorId && (
                      <span className="ml-auto text-xs text-muted-foreground">creator</span>
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