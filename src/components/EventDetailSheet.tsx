import { X, MapPin, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { AppEvent } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CH", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function fmtTime(iso: string) {
  if (!iso || !iso.includes("T")) return "";
  const d = new Date(iso);
  if (d.getHours() === 0 && d.getMinutes() === 0) return "";
  return d.toLocaleTimeString("en-CH", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  events: AppEvent[];
  meId: string;
  onClose: () => void;
  onEdit: (event: AppEvent) => void;
  onDelete: (id: string) => void;
}

export default function EventDetailSheet({
  events, meId, onClose, onEdit, onDelete,
}: Props) {
  const main   = events[0];
  const isOwn  = main.source === "community" && main.authorId === meId;
  const isMultiDay = !!main.endDate;

  const handleDelete = () => {
    if (confirm(`Delete "${main.title}"?`)) {
      onDelete(main.id);
    }
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
        {/* Hero image */}
        {main.imageUrl && (
          <div className="relative h-36 shrink-0">
            <img src={main.imageUrl} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
          </div>
        )}

        {/* Header */}
        <div className={`flex shrink-0 items-start justify-between gap-3 px-4 py-3 ${!main.imageUrl ? "border-b border-border" : ""}`}>
          <h2 className="text-sm font-bold leading-tight text-foreground">{main.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            {isOwn && (
              <>
                <button
                  onClick={() => onEdit(main)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button onClick={onClose} aria-label="Close">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {main.venueName}
              {main.distanceKm != null ? ` · ${main.distanceKm} km` : ""}
            </span>
          </div>

          {main.description && (
            <p className="text-sm text-muted-foreground">{main.description}</p>
          )}

          {/* Multi-day range */}
          {isMultiDay && (
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Running dates
              </p>
              <p className="text-sm font-medium text-foreground">
                {fmtDate(main.startDate)} — {fmtDate(main.endDate!)}
              </p>
              {main.price && (
                <p className="mt-1 text-xs font-semibold text-foreground">{main.price}</p>
              )}
              {main.ticketUrl && (
                <a
                  href={main.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#DA2C43]"
                  onClick={(e) => e.stopPropagation()}
                >
                  Get tickets <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Single / multiple dates */}
          {!isMultiDay && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {events.length === 1 ? "Date" : `${events.length} upcoming dates`}
              </p>
              <div className="space-y-2">
                {events.map((e) => {
                  const t = fmtTime(e.startDate);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {fmtDate(e.startDate)}
                        </p>
                        {t && <p className="text-xs text-muted-foreground">{t}</p>}
                      </div>
                      <div className="text-right">
                        {e.price && (
                          <p className="text-xs font-semibold text-foreground">{e.price}</p>
                        )}
                        {e.ticketUrl && (
                          <a
                            href={e.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 flex items-center justify-end gap-1 text-xs font-semibold text-[#DA2C43]"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            Tickets <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}