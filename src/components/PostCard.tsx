import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Eye, EyeOff, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { AvailabilityPost, FriendGroup, User } from "@/lib/types";
import { formatTimeRange, relativeTime } from "@/lib/status";
import StatusBadge from "./StatusBadge";
import { getUser, listGroups, getCurrentUser, deletePost, getParticipantCount, isCurrentUserParticipating } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Props {
  post: AvailabilityPost;
  onDeleted?: () => void;
}

export default function PostCard({ post, onDeleted }: Props) {
  const navigate = useNavigate();
  const [author, setAuthor] = useState<User | undefined>();
  const [group, setGroup] = useState<FriendGroup | undefined>();
  const [isOwn, setIsOwn] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [imDown, setImDown] = useState(false);

  useEffect(() => {
    getUser(post.authorId).then(setAuthor);
    listGroups().then((gs) =>
      setGroup(gs.find((g) => g.id === post.visibleToGroupId)),
    );
    getCurrentUser().then((me) => setIsOwn(me?.id === post.authorId));
    getParticipantCount(post.id).then(setParticipantCount);
    isCurrentUserParticipating(post.id).then(setImDown);
  }, [post]);

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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await deletePost(post.id);
    if (ok) {
      toast.success("Post deleted");
      onDeleted?.();
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/create?edit=${post.id}`);
  };

  return (
    <article
      className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/30"
      onClick={() => navigate(`/posts/${post.id}`)}
    >
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
        {isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                aria-label="Post actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
        {(participantCount > 0 || imDown) && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>
              {participantCount} down
              {imDown && <span className="ml-1 text-primary font-medium">· You're down</span>}
            </span>
          </div>
        )}
      </dl>
    </article>
  );
}
