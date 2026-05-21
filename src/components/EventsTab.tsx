import { useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { AppEvent, EventCategory, UserLocation } from "@/lib/types";
import EventCard from "./EventCard";
import AddEventSheet from "./AddEventSheet";
import EventDetailSheet from "./EventDetailSheet";
import { groupEvents, deleteCommunityEvent } from "@/lib/events";

type CategoryFilter = Exclude<EventCategory, "community"> | "all";

const FILTERS: { value: CategoryFilter; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "✦" },
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "arts", label: "Arts", emoji: "🎨" },
  { value: "sport", label: "Sport", emoji: "⚽" },
  { value: "party", label: "Party", emoji: "🎉" },
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "wellness", label: "Wellness", emoji: "🧘" },
  { value: "education", label: "Education", emoji: "🎓" },
  { value: "outdoor", label: "Outdoor", emoji: "🌿" },
  { value: "other", label: "Other", emoji: "📅" },
];

interface Props {
  events: AppEvent[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  location: UserLocation | null;
  meId: string;
  onRefresh: () => void;
  onLoadMore?: () => void;
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return null;

  return date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function formatDateLabel(value: string) {
  if (!value) return "";

  const date = parseDateInput(value);
  if (!date) return "";

  return date.toLocaleDateString("en-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function eventMatchesDate(event: AppEvent, selectedDate: string) {
  if (!selectedDate) return true;

  const selected = parseDateInput(selectedDate);
  if (!selected) return true;

  const selectedStart = startOfDay(selected);
  const selectedEnd = endOfDay(selected);

  const eventStart = new Date(event.startDate);
  if (!Number.isFinite(eventStart.getTime())) return false;

  const eventEnd = event.endDate ? new Date(event.endDate) : null;

  if (eventEnd && Number.isFinite(eventEnd.getTime())) {
    return eventStart <= selectedEnd && eventEnd >= selectedStart;
  }

  return eventStart >= selectedStart && eventStart <= selectedEnd;
}

export default function EventsTab({
  events,
  loading,
  loadingMore = false,
  hasMore = true,
  location,
  meId,
  onRefresh,
  onLoadMore,
}: Props) {
  const [selectedCategories, setSelectedCategories] = useState<CategoryFilter[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AppEvent[] | null>(null);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const hasDateFilter = Boolean(selectedDate);

  const toggleCategory = (category: CategoryFilter) => {
    if (category === "all") {
      setSelectedCategories([]);
      return;
    }

    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const communityEvents = useMemo(
    () => events.filter((e) => e.source === "community"),
    [events],
  );

  const externalEvents = useMemo(
    () => events.filter((e) => e.source !== "community"),
    [events],
  );

  const filtered = useMemo(() => {
    return externalEvents.filter((event) => {
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(event.category as CategoryFilter);

      const matchesDate = eventMatchesDate(event, selectedDate);

      return matchesCategory && matchesDate;
    });
  }, [externalEvents, selectedCategories, selectedDate]);

  const grouped = useMemo(() => groupEvents(filtered), [filtered]);

  useEffect(() => {
    if (!onLoadMore) return;
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0,
      },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading, loadingMore]);

  const clearDateFilter = () => {
    setSelectedDate("");
  };

  return (
    <>
      {/* Category filters */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-1 pt-3">
        {FILTERS.map((f) => {
          const isActive =
            f.value === "all"
              ? selectedCategories.length === 0
              : selectedCategories.includes(f.value);

          return (
            <button
              key={f.value}
              onClick={() => toggleCategory(f.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                isActive
                  ? "border-[#DA2C43] bg-[#DA2C43] text-white"
                  : "border-border bg-card text-muted-foreground hover:bg-primary-soft/70 hover:text-primary"
              }`}
            >
              {f.emoji} {f.label}
            </button>
          );
        })}
      </div>

      {/* Single date filter */}
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Date
        </span>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-7 min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
        />

        {hasDateFilter && (
          <>
            <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
              {formatDateLabel(selectedDate)}
            </span>

            <button
              onClick={clearDateFilter}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Community CTA */}
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 dark:border-orange-900 dark:bg-orange-950/20">
        <Megaphone className="h-4 w-4 shrink-0 text-orange-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">
            Know a local event?
          </p>
          <p className="text-[11px] text-orange-600 dark:text-orange-400">
            Add it for your neighbourhood to discover
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 rounded-lg bg-[#DA2C43] px-2.5 py-1.5 text-xs font-semibold text-white"
        >
          + Add
        </button>
      </div>

      {/* Community events */}
      {communityEvents.length > 0 && (
        <>
          <p className="px-4 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            📍 Community · Near you
          </p>
          <div className="px-4 pt-1">
            {communityEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                datesCount={1}
                onClick={() => setSelectedGroup([event])}
              />
            ))}
          </div>
        </>
      )}

      {/* External events */}
      <p className="px-4 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Upcoming ·{" "}
        {location
          ? `Near ${location.area ?? location.city}`
          : "Set your location"}
      </p>

      <div className="px-4 pb-4 pt-1">
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading events…
          </p>
        ) : !location ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Set your location above to see events nearby
          </p>
        ) : grouped.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No events found for this filter
            </p>

            {hasMore && onLoadMore && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
              >
                {loadingMore ? "Loading more…" : "Load more events"}
              </button>
            )}
          </div>
        ) : (
          <>
            {grouped.map((group) => (
              <EventCard
                key={group[0].id}
                event={group[0]}
                datesCount={group.length}
                onClick={() => setSelectedGroup(group)}
              />
            ))}

            <div ref={loadMoreRef} className="py-6 text-center">
              {loadingMore ? (
                <p className="text-xs text-muted-foreground">
                  Loading more events…
                </p>
              ) : hasMore ? (
                <p className="text-xs text-muted-foreground">
                  Scroll for more events
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No more events nearby
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {selectedGroup && (
        <EventDetailSheet
          events={selectedGroup}
          meId={meId}
          onClose={() => setSelectedGroup(null)}
          onEdit={(event) => {
            setEditingEvent(event);
            setSelectedGroup(null);
          }}
          onDelete={(id) => {
            deleteCommunityEvent(id);
            setSelectedGroup(null);
            onRefresh();
          }}
        />
      )}

      {(showAdd || editingEvent) && location && (
        <AddEventSheet
          city={location.city}
          authorId={meId}
          editEvent={editingEvent ?? undefined}
          onClose={() => {
            setShowAdd(false);
            setEditingEvent(null);
          }}
          onAdded={() => {
            onRefresh();
            setEditingEvent(null);
          }}
        />
      )}
    </>
  );
}