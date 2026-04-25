import { StatusType } from "./types";

export const STATUS_META: Record<
  StatusType,
  { label: string; emoji: string; colorVar: string }
> = {
  free: { label: "Free", emoji: "✨", colorVar: "status-free" },
  studying: { label: "Studying", emoji: "📚", colorVar: "status-studying" },
  lunch: { label: "Lunch", emoji: "🥗", colorVar: "status-lunch" },
  coffee: { label: "Coffee", emoji: "☕", colorVar: "status-coffee" },
  party: { label: "Party", emoji: "🎉", colorVar: "status-party" },
  gym: { label: "Gym", emoji: "🏋️", colorVar: "status-gym" },
  busy: { label: "Busy", emoji: "🚫", colorVar: "status-busy" },
};

export const STATUS_ORDER: StatusType[] = [
  "free",
  "studying",
  "lunch",
  "coffee",
  "party",
  "gym",
  "busy",
];

export function formatTimeRange(startISO: string, endISO: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  return `${fmt(startISO)} – ${fmt(endISO)}`;
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.round(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
