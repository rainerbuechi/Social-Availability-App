import { useEffect, useState } from "react";
import { MapPin, Eye, EyeOff } from "lucide-react";
import { AvailabilityPost, FriendGroup, User } from "@/lib/types";
import { formatTimeRange, relativeTime } from "@/lib/status";
import StatusBadge from "./StatusBadge";
import { getUser, listGroups } from "@/lib/api";

interface Props {
  post: AvailabilityPost;
}

export default function PostCard({ post }: Props) {
  const [author, setAuthor] = useState<User | undefined>();
  const [group, setGroup] = useState<FriendGroup | undefined>();

  useEffect(() => {
    getUser(post.authorId).then(setAuthor);
    listGroups().then((gs) =>
      setGroup(gs.find((g) => g.id === post.visibleToGroupId)),
    );
  }, [post.authorId, post.visibleToGroupId]);

  const initials = author?.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const locationLabel = (() => {
    if (post.locationPrecision === "hidden" || !post.locationName)
      return "Location hidden";
    if (post.locationPrecision === "approximate")
      return `Near ${post.locationName}`;
    return post.locationName;
  })();

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {author?.name ?? "…"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{author?.username} · {relativeTime(post.createdAt)}
          </p>
        </div>
        <StatusBadge status={post.status} size="sm" />
      </header>

      {post.message && (
        <p className="mt-3 text-[15px] leading-snug text-foreground">
          {post.message}
        </p>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span aria-hidden>🕒</span>
          <span>{formatTimeRange(post.startTime, post.endTime)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {post.locationPrecision === "hidden" ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          <span>{locationLabel}</span>
        </div>
        {group && (
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span>
              {group.emoji} {group.name}
            </span>
          </div>
        )}
      </dl>
    </article>
  );
}
