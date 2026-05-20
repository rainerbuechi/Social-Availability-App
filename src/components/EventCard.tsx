import { MapPin } from "lucide-react";
import { AppEvent, EventCategory } from "@/lib/types";

const CAT_CONFIG: Record<
  EventCategory,
  { emoji: string; label: string; classes: string }
> = {
  music: {
    emoji: "🎵",
    label: "Music",
    classes:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  arts: {
    emoji: "🎨",
    label: "Arts",
    classes:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  sport: {
    emoji: "⚽",
    label: "Sport",
    classes:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  party: {
    emoji: "🎉",
    label: "Party",
    classes:
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  },
  food: {
    emoji: "🍽️",
    label: "Food",
    classes:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  wellness: {
    emoji: "🧘",
    label: "Wellness",
    classes:
      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  },
  education: {
    emoji: "🎓",
    label: "Education",
    classes:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  outdoor: {
    emoji: "🌿",
    label: "Outdoor",
    classes:
      "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300",
  },
  community: {
    emoji: "🌱",
    label: "Local",
    classes:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  other: {
    emoji: "📅",
    label: "Event",
    classes: "bg-muted text-muted-foreground",
  },
};

const SOURCE_BADGE: Record<string, string> = {
  ticketmaster: "bg-blue-600 text-white",
  eventfrog: "bg-green-600 text-white",
  community: "bg-emerald-700 text-white",
};

const SOURCE_LABEL: Record<string, string> = {
  ticketmaster: "T",
  eventfrog: "E",
  community: "C",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CH", {
    day: "numeric",
    month: "short",
  });
}

function fmtDateRange(start: string, end?: string): string {
  if (!end || end.split("T")[0] === start.split("T")[0]) {
    return new Date(start).toLocaleDateString("en-CH", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  const s = new Date(start);
  const e = new Date(end);

  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${s.toLocaleDateString("en-CH", {
      month: "short",
    })}`;
  }

  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function fmtTime(iso: string) {
  if (!iso || !iso.includes("T")) return "";

  const d = new Date(iso);

  if (d.getHours() === 0 && d.getMinutes() === 0) return "";

  return d.toLocaleTimeString("en-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  event: AppEvent;
  datesCount?: number;
  onClick?: () => void;
}

export default function EventCard({ event, datesCount = 1, onClick }: Props) {
  const cat = CAT_CONFIG[event.category] ?? CAT_CONFIG.other;
  const time = event.endDate ? null : fmtTime(event.startDate);

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 border-b border-border py-3 text-left transition-colors last:border-0 hover:bg-muted/30"
    >
      {/* Thumbnail */}
      <div className="relative shrink-0">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-muted text-2xl">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            cat.emoji
          )}
        </div>

        <span
          className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background text-[9px] font-bold ${
            SOURCE_BADGE[event.source] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {SOURCE_LABEL[event.source] ?? "?"}
        </span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {event.title}
        </p>

        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {event.venueName}
            {event.distanceKm != null ? ` · ${event.distanceKm} km` : ""}
          </span>
        </p>

        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.classes}`}
          >
            {cat.label}
          </span>

          {datesCount > 1 && (
            <span className="text-[10px] text-muted-foreground">
              {datesCount} dates →
            </span>
          )}
        </div>
      </div>

      {/* Date + price */}
      <div className="shrink-0 text-right">
        <p className="text-[10px] leading-tight text-muted-foreground">
          {fmtDateRange(event.startDate, event.endDate)}
        </p>

        {time && <p className="text-[10px] text-muted-foreground">{time}</p>}

        {event.price && (
          <p className="mt-1 text-xs font-semibold text-foreground">
            {event.price}
          </p>
        )}
      </div>
    </button>
  );
}