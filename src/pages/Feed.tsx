import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import PostCard from "@/components/PostCard";
import { Calendar } from "@/components/ui/calendar";

import { listFeed } from "@/lib/api";
import { AvailabilityPost } from "@/lib/types";

type FeedView = "activity" | "calendar";

const PERSON_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function colorForAuthor(authorId: string) {
  let hash = 0;

  for (let i = 0; i < authorId.length; i += 1) {
    hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return PERSON_COLORS[Math.abs(hash) % PERSON_COLORS.length];
}

function toDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Feed() {
  const [posts, setPosts] = useState<AvailabilityPost[]>([]);
  const [view, setView] = useState<FeedView>("activity");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfToday());

  const today = useMemo(() => startOfToday(), []);

  const refresh = useCallback(() => {
    listFeed().then(setPosts);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const futurePosts = useMemo(() => {
    return posts.filter((post) => new Date(post.startTime) >= today);
  }, [posts, today]);

  const postsForDate = useMemo(() => {
    if (!selectedDate) return [];

    return futurePosts.filter((post) => {
      const postDate = new Date(post.startTime);
      return isSameCalendarDay(postDate, selectedDate);
    });
  }, [futurePosts, selectedDate]);

  const postsByDateKey = useMemo(() => {
    const map = new Map<string, AvailabilityPost[]>();

    futurePosts.forEach((post) => {
      const date = new Date(post.startTime);
      const key = date.toDateString();

      map.set(key, [...(map.get(key) ?? []), post]);
    });

    return map;
  }, [futurePosts]);

  const createUrl = selectedDate
    ? `/create?date=${toDateParam(selectedDate)}`
    : "/create";

  return (
    <div className="min-h-full overflow-x-hidden">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-4 backdrop-blur">
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setView("activity")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "activity"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Activity
            </button>

            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Calendar
            </button>
          </div>

          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-bold tracking-tight">
            Down<span className="text-primary">?</span>
          </h1>

          <Link
            to="/create"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Post
          </Link>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {view === "activity"
            ? `${posts.length} friends sharing`
            : selectedDate
              ? `${postsForDate.length} posts on ${selectedDate.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                })}`
              : "Pick a date"}
        </p>
      </header>

      {view === "activity" && (
        <div className="space-y-3 p-4">
          {posts.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No one's down yet. Be the first 👀
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} onDeleted={refresh} />
            ))
          )}
        </div>
      )}

      {view === "calendar" && (
        <div className="w-full overflow-x-hidden p-4">
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
                  setSelectedDate(date);
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
                  "h-8 w-8 rounded-full border border-border bg-background p-0 opacity-80 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "grid grid-cols-7",
                head_cell:
                  "flex h-8 items-center justify-center text-[0.7rem] font-medium text-muted-foreground",
                row: "grid grid-cols-7",
                cell: "relative flex h-11 items-center justify-center text-center text-sm",
                day: "relative flex h-10 w-10 items-center justify-center rounded-2xl text-sm transition-colors hover:bg-muted",
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "border border-primary/50 font-semibold",
                day_disabled: "text-muted-foreground/30 opacity-40",
                day_outside: "text-muted-foreground/30 opacity-40",
              }}
              components={{
                DayContent: ({ date }) => {
                  const postsOnDay = postsByDateKey.get(date.toDateString()) ?? [];
                  const dotColors = Array.from(
                    new Set(postsOnDay.map((post) => colorForAuthor(post.authorId))),
                  ).slice(0, 4);

                  return (
                    <div className="flex h-10 w-10 flex-col items-center justify-center">
                      <span className="leading-none">{date.getDate()}</span>

                      {dotColors.length > 0 && (
                        <div className="mt-1 flex max-w-8 items-center justify-center gap-0.5">
                          {dotColors.map((color) => (
                            <span
                              key={color}
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>

          <div className="mt-4 space-y-3">
            {!selectedDate ? (
              <p className="py-10 text-center text-muted-foreground">
                Pick a date to see posts
              </p>
            ) : postsForDate.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-6 text-center text-muted-foreground">
                <p>No posts on this day.</p>

                <Link
                  to={createUrl}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Create one
                </Link>
              </div>
            ) : (
              postsForDate.map((post) => (
                <PostCard key={post.id} post={post} onDeleted={refresh} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}