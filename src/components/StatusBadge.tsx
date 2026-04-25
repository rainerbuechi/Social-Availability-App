import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/status";
import { StatusType } from "@/lib/types";

interface Props {
  status: StatusType;
  className?: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, className, size = "md" }: Props) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
      style={{
        backgroundColor: `hsl(var(--${meta.colorVar}) / 0.12)`,
        color: `hsl(var(--${meta.colorVar}))`,
      }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
