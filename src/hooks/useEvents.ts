import { useEffect, useState } from "react";
import { AppEvent, UserLocation } from "@/lib/types";
import { fetchTicketmasterEvents, listCommunityEvents } from "@/lib/events";

export function useEvents(location: UserLocation | null) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const [tm, community] = await Promise.all([
        fetchTicketmasterEvents(location),
        Promise.resolve(listCommunityEvents()),
        // fetchEventfrogEvents(location), // ← uncomment when Eventfrog key arrives
      ]);
      setEvents(
        [...tm, ...community].sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [location?.city, location?.area]);

  return { events, loading, refresh };
}