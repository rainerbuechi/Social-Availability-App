import { useEffect, useRef, useState } from "react";
import { AppEvent, UserLocation } from "@/lib/types";
import { fetchTicketmasterEvents, listCommunityEvents } from "@/lib/events";

export function useEvents(location: UserLocation | null) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadingMoreRef = useRef(false);

  const sortEvents = (items: AppEvent[]) =>
    [...items].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  const dedupeEvents = (items: AppEvent[]) => {
    const seen = new Set<string>();

    return items.filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  };

  const refresh = async () => {
    if (!location) return;

    setLoading(true);
    setPage(0);
    setHasMore(true);

    try {
      const [external, community] = await Promise.all([
        fetchTicketmasterEvents(location, 0),
        Promise.resolve(listCommunityEvents()),
      ]);

      setEvents(sortEvents(dedupeEvents([...external, ...community])));
      setHasMore(external.length > 0);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!location || loading || loadingMoreRef.current || !hasMore) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const moreExternal = await fetchTicketmasterEvents(location, nextPage);

      if (moreExternal.length === 0) {
        setHasMore(false);
        return;
      }

      setEvents((current) => sortEvents(dedupeEvents([...current, ...moreExternal])));
      setPage(nextPage);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [location?.city, location?.area, location?.lat, location?.lng]);

  return {
    events,
    loading,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
  };
}