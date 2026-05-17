import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";

import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { FriendGroup, LocationPrecision, StatusType } from "@/lib/types";
import { createPost, getPost, listGroups, updatePost } from "@/lib/api";

const pad = (n: number) => n.toString().padStart(2, "0");
const toLocalTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDateParam(dateParam: string | null) {
  if (!dateParam) return null;

  const [year, month, day] = dateParam.split("-").map(Number);

  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function getInitialDate(dateParam: string | null) {
  const today = startOfToday();
  const parsedDate = parseDateParam(dateParam);

  if (!parsedDate || parsedDate < today) {
    return startOfToday();
  }

  return parsedDate;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function CreateStatus() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const editId = searchParams.get("edit");
  const dateParam = searchParams.get("date");

  const initialDate = useMemo(() => getInitialDate(dateParam), [dateParam]);

  const initialStartDate = useMemo(() => {
    const now = new Date();
    const date = new Date(initialDate);
    date.setHours(now.getHours(), now.getMinutes(), 0, 0);
    return date;
  }, [initialDate]);

  const initialEndDate = useMemo(
    () => new Date(initialStartDate.getTime() + 60 * 60_000),
    [initialStartDate],
  );

  const today = useMemo(() => startOfToday(), []);

  const [status, setStatus] = useState<StatusType>("free");
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDate,
  );
  const [start, setStart] = useState(toLocalTime(initialStartDate));
  const [end, setEnd] = useState(toLocalTime(initialEndDate));
  const [locationName, setLocationName] = useState("");
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [loaded, setLoaded] = useState(!editId);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listGroups().then((gs) => {
      const realGroups = gs.filter(
        (group) => group.name.trim().toLowerCase() !== "everyone",
      );

      setGroups(realGroups);
    });
  }, []);

  useEffect(() => {
    if (!editId) return;

    getPost(editId).then((post) => {
      if (!post) {
        toast.error("Post not found");
        navigate("/feed");
        return;
      }

      const postStartDate = new Date(post.startTime);
      const postEndDate = new Date(post.endTime);

      postStartDate.setHours(0, 0, 0, 0);

      setStatus(post.status);
      setMessage(post.message ?? "");
      setSelectedDate(postStartDate);
      setStart(toLocalTime(new Date(post.startTime)));
      setEnd(toLocalTime(postEndDate));
      setLocationName(post.locationName ?? "");
      setGroupId(post.visibleToGroupId ?? "");
      setLoaded(true);
    });
  }, [editId, navigate]);

  const buildDateTime = (
    dateValue: Date,
    hhmm: string,
    shouldRollToNextDay = false,
  ) => {
    const [hours, minutes] = hhmm.split(":").map(Number);

    const nextDate = new Date(dateValue);
    nextDate.setHours(hours, minutes, 0, 0);

    if (shouldRollToNextDay) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      toast.error("Please choose a date.");
      return;
    }

    const selectedDay = new Date(selectedDate);
    selectedDay.setHours(0, 0, 0, 0);

    if (selectedDay < today) {
      toast.error("Please choose today or a future date.");
      return;
    }

    const startDate = buildDateTime(selectedDay, start);
    let endDate = buildDateTime(selectedDay, end);

    if (endDate <= startDate) {
      endDate = buildDateTime(selectedDay, end, true);
    }

    const payload = {
      status,
      message: message.trim() || undefined,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      locationName: locationName.trim() || undefined,
      locationPrecision: "exact" as LocationPrecision,
      visibleToGroupId: groupId || "",
    };

    setIsSaving(true);

    try {
      if (editId) {
        await updatePost(editId, payload);
        toast.success("Post updated!");
      } else {
        await createPost(payload);
        toast.success("You're down!");
      }

      navigate("/feed");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not save post");
    } finally {
      setIsSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="min-h-full overflow-x-hidden bg-muted/20">
      <header className="safe-top sticky top-0 z-30 border-b border-border/70 bg-background/95 px-4 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-primary-soft hover:text-primary"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight">
              {editId ? "Edit availability" : "Share availability"}
            </h1>

            <p className="truncate text-xs text-muted-foreground">
              {selectedDate ? formatDateLabel(selectedDate) : "Choose a date"}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={onSubmit} className="space-y-6 p-4 pb-24">
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
                    "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-sm shadow-sm transition-colors",
                    active
                      ? "border-[#DA2C43] bg-[#DA2C43]/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:bg-primary-soft/70 hover:text-foreground",
                  )}
                >
                  <span className="text-xl">{meta.emoji}</span>
                  <span className="font-semibold">{meta.label}</span>
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
            className="resize-none rounded-2xl border-border bg-card focus-visible:ring-[#DA2C43]"
            rows={2}
          />
        </section>

        <section className="space-y-2">
          <Label>Date</Label>

          <div className="mx-auto w-full max-w-sm rounded-3xl border border-border bg-card p-3 shadow-sm">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (!date) {
                  setSelectedDate(undefined);
                  return;
                }

                const picked = new Date(date);
                picked.setHours(0, 0, 0, 0);

                if (picked >= today) {
                  setSelectedDate(picked);
                }
              }}
              disabled={{ before: today }}
              showOutsideDays={false}
              className="mx-auto w-full p-0"
              classNames={{
                months: "flex w-full justify-center",
                month: "w-full space-y-4",
                caption: "relative flex justify-center pt-1 pb-2 items-center",
                caption_label: "text-sm font-semibold",
                nav: "flex items-center gap-1",
                nav_button:
                  "h-8 w-8 rounded-full border border-border bg-background p-0 opacity-80 hover:bg-primary-soft hover:text-primary hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "grid grid-cols-7",
                head_cell:
                  "flex h-8 items-center justify-center text-[0.7rem] font-medium text-muted-foreground",
                row: "grid grid-cols-7",
                cell: "relative flex h-11 items-center justify-center text-center text-sm",
                day: "relative flex h-10 w-10 items-center justify-center rounded-2xl text-sm transition-colors hover:bg-primary-soft hover:text-primary",
                day_selected:
                  "bg-[#DA2C43] text-white hover:bg-[#DA2C43] hover:text-white focus:bg-[#DA2C43] focus:text-white",
                day_today:
                  "border border-[#DA2C43]/50 font-semibold text-[#DA2C43]",
                day_disabled: "text-muted-foreground/30 opacity-40",
                day_outside: "text-muted-foreground/30 opacity-40",
              }}
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {selectedDate
              ? `Selected: ${formatDateLabel(selectedDate)}`
              : "Pick today or a future date"}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="start">Start</Label>

            <Input
              id="start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End</Label>

            <Input
              id="end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
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
            className="h-11 rounded-2xl bg-card focus-visible:ring-[#DA2C43]"
          />
        </section>

        <section className="space-y-2">
          <Label>Visible to</Label>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setGroupId("")}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border-2 p-3 text-left shadow-sm transition-colors",
                groupId === ""
                  ? "border-[#DA2C43] bg-[#DA2C43]/10"
                  : "border-border bg-card hover:border-primary/35 hover:bg-primary-soft/70",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-lg">👥</span>
                All friends
              </span>

              <span className="text-xs text-muted-foreground">
                Your accepted friends
              </span>
            </button>

            {groups.map((group) => {
              const active = group.id === groupId;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setGroupId(group.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border-2 p-3 text-left shadow-sm transition-colors",
                    active
                      ? "border-[#DA2C43] bg-[#DA2C43]/10"
                      : "border-border bg-card hover:border-primary/35 hover:bg-primary-soft/70",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-lg">{group.emoji}</span>
                    {group.name}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {group.memberIds.length} people
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <Button
          type="submit"
          disabled={isSaving}
          className="h-12 w-full rounded-full bg-[#DA2C43] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#c9273c]"
        >
          {isSaving ? "Saving..." : editId ? "Save changes" : "I'm down"}
        </Button>
      </form>
    </div>
  );
}