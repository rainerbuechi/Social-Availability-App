import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppEvent, EventCategory } from "@/lib/types";
import { addCommunityEvent, editCommunityEvent } from "@/lib/events";
import { toast } from "sonner";

const DEFAULT_CATEGORIES: { value: EventCategory; label: string; emoji: string }[] = [
  { value: "music", label: "Music", emoji: "🎵" },
  { value: "arts", label: "Arts", emoji: "🎨" },
  { value: "sport", label: "Sport", emoji: "⚽" },
  { value: "party", label: "Party", emoji: "🎉" },
  { value: "other", label: "Other", emoji: "📅" },
];

interface Props {
  city: string;
  authorId: string;
  editEvent?: AppEvent;
  onClose: () => void;
  onAdded: () => void;
}

function normalizeCustomCategory(value: string): EventCategory {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") as EventCategory;
}

function formatCustomCategoryLabel(value: string): string {
  return value
    .trim()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCategoryLabel(category: EventCategory) {
  const existing = DEFAULT_CATEGORIES.find((item) => item.value === category);
  return existing?.label ?? formatCustomCategoryLabel(category);
}

export default function AddEventSheet({
  city,
  authorId,
  editEvent,
  onClose,
  onAdded,
}: Props) {
  const isEdit = !!editEvent;

  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [area, setArea] = useState("");
  const [startDate, setStartDate] = useState("");
  const [time, setTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [category, setCategory] = useState<EventCategory>("other");
  const [customCategory, setCustomCategory] = useState("");
  const [price, setPrice] = useState("");

  const isKnownCategory = useMemo(
    () => DEFAULT_CATEGORIES.some((item) => item.value === category),
    [category],
  );

  const visibleCategories = useMemo(() => {
    if (!editEvent || isKnownCategory) return DEFAULT_CATEGORIES;

    return [
      ...DEFAULT_CATEGORIES,
      {
        value: category,
        label: getCategoryLabel(category),
        emoji: "✨",
      },
    ];
  }, [editEvent, isKnownCategory, category]);

  useEffect(() => {
    if (!editEvent) return;

    setTitle(editEvent.title);
    setVenue(editEvent.venueName);
    setArea(editEvent.area ?? "");
    setPrice(editEvent.price ?? "");
    setCategory(editEvent.category);

    const known = DEFAULT_CATEGORIES.some(
      (item) => item.value === editEvent.category,
    );

    if (!known) {
      setCustomCategory(getCategoryLabel(editEvent.category));
    }

    if (editEvent.endDate) {
      setIsMultiDay(true);
      setStartDate(editEvent.startDate.split("T")[0]);
      setEndDate(editEvent.endDate.split("T")[0]);
    } else if (editEvent.startDate.includes("T")) {
      setStartDate(editEvent.startDate.split("T")[0]);
      setTime(editEvent.startDate.split("T")[1].slice(0, 5));
    } else {
      setStartDate(editEvent.startDate);
    }
  }, [editEvent]);

  const handleAddCustomCategory = () => {
    const normalized = normalizeCustomCategory(customCategory);

    if (!normalized) {
      toast.error("Enter a category name first");
      return;
    }

    if (normalized === "community") {
      toast.error("Community is reserved");
      return;
    }

    setCategory(normalized);
    toast.success(`Category "${formatCustomCategoryLabel(normalized)}" selected`);
  };

  const handleSubmit = () => {
    if (!title.trim() || !venue.trim() || !startDate) {
      toast.error("Title, venue and date are required");
      return;
    }

    if (isMultiDay && endDate && endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    const computedStart =
      !isMultiDay && time ? `${startDate}T${time}:00` : startDate;

    const computedEnd = isMultiDay && endDate ? endDate : undefined;

    const payload = {
      title: title.trim(),
      category,
      venueName: venue.trim(),
      area: area.trim() || undefined,
      city,
      startDate: computedStart,
      endDate: computedEnd,
      price: price.trim() || undefined,
    };

    if (isEdit && editEvent) {
      editCommunityEvent(editEvent.id, payload);
      toast.success("Event updated ✓");
    } else {
      addCommunityEvent(payload, authorId);
      toast.success("Event added! 🎉");
    }

    onAdded();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-background"
        style={{ maxHeight: "85dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">
            {isEdit ? "Edit event" : "Add a local event"}
          </h2>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <Input
            placeholder="Event title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl"
          />

          <Input
            placeholder="Venue name *"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="rounded-xl"
          />

          <Input
            placeholder="Area / neighbourhood"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="rounded-xl"
          />

          {/* Multi-day toggle */}
          <button
            type="button"
            onClick={() => setIsMultiDay((value) => !value)}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
              isMultiDay
                ? "border-[#DA2C43] bg-[#DA2C43]/10 text-[#DA2C43]"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            <span>Multi-day event</span>
            <span>{isMultiDay ? "✓ On" : "Off"}</span>
          </button>

          {isMultiDay ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="mb-1 text-[10px] text-muted-foreground">
                  Start date
                </p>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="flex-1">
                <p className="mb-1 text-[10px] text-muted-foreground">
                  End date
                </p>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 rounded-xl"
              />

              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1 rounded-xl"
              />
            </div>
          )}

          <Input
            placeholder="Price (e.g. CHF 10) — leave blank if free"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-xl"
          />

          {/* Categories */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </p>

            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    category === c.value
                      ? "border-[#DA2C43] bg-[#DA2C43] text-white"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Create custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
                className="rounded-xl text-xs"
              />

              <button
                type="button"
                onClick={handleAddCustomCategory}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted"
                aria-label="Add custom category"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {!isKnownCategory && (
              <p className="text-[11px] text-muted-foreground">
                Selected custom category:{" "}
                <span className="font-semibold text-foreground">
                  {getCategoryLabel(category)}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-4 py-3">
          <Button
            className="w-full rounded-full bg-[#DA2C43] text-white hover:bg-[#c9273c]"
            onClick={handleSubmit}
          >
            {isEdit ? "Save changes" : "Add Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}