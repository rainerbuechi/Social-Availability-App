import { StatusType, StandardActivityType } from "./types";

export type ActivityMeta = {
  label: string;
  emoji: string;
  colorVar: string;
};

export const ACTIVITY_META: Record<StandardActivityType, ActivityMeta> = {
  free: { label: "Free", emoji: "✨", colorVar: "status-free" },
  studying: { label: "Studying", emoji: "📚", colorVar: "status-studying" },
  lunch: { label: "Lunch", emoji: "🥗", colorVar: "status-lunch" },
  coffee: { label: "Coffee", emoji: "☕", colorVar: "status-coffee" },
  party: { label: "Party", emoji: "🎉", colorVar: "status-party" },
  gym: { label: "Gym", emoji: "🏋️", colorVar: "status-gym" },
};

export const ACTIVITY_ORDER: StandardActivityType[] = [
  "free",
  "studying",
  "lunch",
  "coffee",
  "party",
  "gym",
];

export function isCustomActivity(status: StatusType): boolean {
  return status.startsWith("custom:");
}

export function createCustomActivityStatus(label: string, emoji: string): StatusType {
  const cleanLabel = label.trim();
  const cleanEmoji = emoji.trim() || "✨";

  return `custom:${encodeURIComponent(cleanEmoji)}:${encodeURIComponent(cleanLabel)}`;
}

export function getActivityMeta(status: StatusType): ActivityMeta {
  if (isCustomActivity(status)) {
    const [, encodedEmoji, encodedLabel] = status.split(":");

    return {
      emoji: encodedEmoji ? decodeURIComponent(encodedEmoji) : "✨",
      label: encodedLabel ? decodeURIComponent(encodedLabel) : "Custom",
      colorVar: "status-free",
    };
  }

  return ACTIVITY_META[status as StandardActivityType] ?? {
    label: "Activity",
    emoji: "✨",
    colorVar: "status-free",
  };
}

// Temporary backwards-compatible exports.
// Existing files can still import STATUS_META / STATUS_ORDER until we rename them.
export const STATUS_META = ACTIVITY_META;
export const STATUS_ORDER = ACTIVITY_ORDER;

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