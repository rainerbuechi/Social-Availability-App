import { useEffect, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AppEvent[] | null>(null);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const communityEvents = events.filter((e) => e.source === "community");
  const externalEvents = events.filter((e) => e.source !== "community");

  const filtered =
    categoryFilter === "all"
      ? externalEvents
      : externalEvents.filter((e) => e.category === categoryFilter);

  const grouped = groupEvents(filtered);

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

  return (
    <>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-1 pt-3">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setCategoryFilter(f.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
              categoryFilter === f.value
                ? "border-[#DA2C43] bg-[#DA2C43] text-white"
                : "border-border bg-card text-muted-foreground hover:bg-primary-soft/70 hover:text-primary"
            }`}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

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
          <p className="py-12 text-center text-sm text-muted-foreground">
            No events found nearby
          </p>
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