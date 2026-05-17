import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

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

function toDateKey(date: Date) {
  return toDateParam(date);
}

function formatDayLabel(date: Date) {
  const today = startOfToday();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameCalendarDay(date, today)) {
    return "Today";
  }

  if (isSameCalendarDay(date, tomorrow)) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function Feed() {
  const [posts, setPosts] = useState<AvailabilityPost[]>([]);
  const [view, setView] = useState<FeedView>("activity");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    startOfToday(),
  );

  const today = useMemo(() => startOfToday(), []);

  const refresh = useCallback(() => {
    listFeed().then(setPosts);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const futurePosts = useMemo(() => {
    return posts
      .filter((post) => new Date(post.startTime) >= today)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [posts, today]);

  const groupedFuturePosts = useMemo(() => {
    const groups = new Map<
      string,
      {
        date: Date;
        posts: AvailabilityPost[];
      }
    >();

    futurePosts.forEach((post) => {
      const date = new Date(post.startTime);
      date.setHours(0, 0, 0, 0);

      const key = toDateKey(date);

      if (!groups.has(key)) {
        groups.set(key, {
          date,
          posts: [],
        });
      }

      groups.get(key)?.posts.push(post);
    });

    return Array.from(groups.values());
  }, [futurePosts]);

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
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      <header className="safe-top shrink-0 border-b border-border/70 bg-background/95 px-4 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Down<span className="text-[#DA2C43]">?</span>
          </h1>

          <Link
            to="/create"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#DA2C43] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c9273c]"
          >
            <Plus className="h-4 w-4" />
            Post
          </Link>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-secondary/80 p-1">
            <button
              type="button"
              onClick={() => setView("activity")}
              className={`rounded-full px-7 py-2.5 text-sm font-semibold transition-all ${
                view === "activity"
                  ? "bg-[#DA2C43] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-primary-soft hover:text-primary"
              }`}
            >
              Activity
            </button>

            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`rounded-full px-7 py-2.5 text-sm font-semibold transition-all ${
                view === "calendar"
                  ? "bg-[#DA2C43] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-primary-soft hover:text-primary"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </header>

      {view === "activity" && (
        <div className="no-scrollbar flex-1 space-y-7 overflow-y-auto p-4 pb-28">
          {futurePosts.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No one's down yet. Be the first 👀
            </div>
          ) : (
            groupedFuturePosts.map((group) => (
              <section key={toDateKey(group.date)} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <div className="h-px flex-1 bg-[#DA2C43]/25" />
                  <div className="whitespace-nowrap rounded-full bg-[#DA2C43]/10 px-3 py-1 text-sm font-bold text-[#DA2C43]">
                    {formatDayLabel(group.date)}
                  </div>
                  <div className="h-px flex-1 bg-[#DA2C43]/25" />
                </div>

                <div className="space-y-3">
                  {group.posts.map((post) => (
                    <PostCard key={post.id} post={post} onDeleted={refresh} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {view === "calendar" && (
        <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 pb-28">
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
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background p-0 leading-none opacity-80 hover:opacity-100 [&_svg]:block [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0",
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
              components={{
                IconLeft: () => (
                  <span className="flex h-full w-full items-center justify-center">
                    <ChevronLeft className="block h-5 w-5" />
                  </span>
                ),
                IconRight: () => (
                  <span className="flex h-full w-full items-center justify-center">
                    <ChevronRight className="block h-5 w-5" />
                  </span>
                ),
                DayContent: ({ date }) => {
                  const postsOnDay =
                    postsByDateKey.get(date.toDateString()) ?? [];
                  const dotColors = Array.from(
                    new Set(
                      postsOnDay.map((post) => colorForAuthor(post.authorId)),
                    ),
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
              <div className="rounded-3xl border border-dashed border-[#DA2C43]/30 bg-card p-6 text-center text-muted-foreground">
                <p>No posts on this day.</p>

                <Link
                  to={createUrl}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#DA2C43] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#c9273c]"
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