import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { FriendGroup, LocationPrecision, StatusType } from "@/lib/types";
import { createPost, updatePost, getPost, listGroups } from "@/lib/api";


const pad = (n: number) => n.toString().padStart(2, "0");
const toLocalTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function CreateStatus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [status, setStatus] = useState<StatusType>("free");
  const [message, setMessage] = useState("");
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60_000);
  const [start, setStart] = useState(toLocalTime(now));
  const [end, setEnd] = useState(toLocalTime(later));
  const [locationName, setLocationName] = useState("");
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    listGroups().then((gs) => {
      setGroups(gs);
      if (!editId && gs[0]) setGroupId(gs[0].id);
    });
  }, [editId]);

  useEffect(() => {
    if (!editId) return;
    getPost(editId).then((p) => {
      if (!p) {
        toast.error("Post not found");
        navigate("/feed");
        return;
      }
      setStatus(p.status);
      setMessage(p.message ?? "");
      setStart(toLocalTime(new Date(p.startTime)));
      setEnd(toLocalTime(new Date(p.endTime)));
      setLocationName(p.locationName ?? "");
      setGroupId(p.visibleToGroupId);
      setLoaded(true);
    });
  }, [editId, navigate]);

  const buildIso = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    const payload = {
      status,
      message: message.trim() || undefined,
      startTime: buildIso(start),
      endTime: buildIso(end),
      locationName: locationName.trim() || undefined,
      locationPrecision: "exact" as LocationPrecision,
      visibleToGroupId: groupId,
    };

    if (editId) {
      await updatePost(editId, payload);
      toast.success("Post updated!");
    } else {
      await createPost(payload);
      toast.success("You're down!");
    }
    navigate("/feed");
  };

  if (!loaded) return null;

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">
          {editId ? "Edit availability" : "Share availability"}
        </h1>
      </header>

      <form onSubmit={onSubmit} className="space-y-6 p-4">
        <section>
          <Label className="mb-2 block">Status</Label>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_ORDER.map((s) => {
              const meta = STATUS_META[s];
              const active = s === status;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-sm transition",
                    active
                      ? "border-primary bg-primary-soft text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/20",
                  )}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <span className="font-medium">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="msg">Message (optional)</Label>
          <Textarea
            id="msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's the vibe?"
            maxLength={140}
            className="resize-none"
            rows={2}
          />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="start">Start</Label>
            <Input
              id="start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">End</Label>
            <Input
              id="end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="loc">Location (optional)</Label>
          <Input
            id="loc"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Blue Bottle, Mission"
          />
        </section>

        <section className="space-y-2">
          <Label>Visible to</Label>
          <div className="space-y-2">
            {groups.map((g) => {
              const active = g.id === groupId;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupId(g.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition",
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-card",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-lg">{g.emoji}</span>
                    {g.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {g.memberIds.length} people
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <Button type="submit" className="h-12 w-full rounded-full text-base">
          {editId ? "Save changes" : "I'm down"}
        </Button>
      </form>
    </div>
  );
}
