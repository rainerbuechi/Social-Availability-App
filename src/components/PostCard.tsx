import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { AvailabilityPost, FriendGroup, User } from "@/lib/types";
import { formatTimeRange } from "@/lib/status";
import StatusBadge from "./StatusBadge";
import {
  deletePost,
  getCurrentUser,
  getParticipantCount,
  getUser,
  isCurrentUserParticipating,
  listGroups,
} from "@/lib/api";

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

    if (post.visibleToGroupId) {
      listGroups().then((gs) =>
        setGroup(gs.find((g) => g.id === post.visibleToGroupId)),
      );
    } else {
      setGroup(undefined);
    }

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
    if (!post.locationName || post.locationPrecision === "hidden") {
      return "Unknown location";
    }

    if (post.locationPrecision === "approximate") {
      return `Near ${post.locationName}`;
    }

    return post.locationName;
  })();

  const audienceLabel = group ? `${group.emoji} ${group.name}` : "👥 All friends";

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const ok = await deletePost(post.id);

    if (ok) {
      toast.success("Post deleted");
      onDeleted?.();
      return;
    }

    toast.error("Could not delete post");
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/create?edit=${post.id}`);
  };

  return (
    <article
      className="relative cursor-pointer rounded-3xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-primary-soft/70"
      onClick={() => navigate(`/posts/${post.id}`)}
    >
      <div className="absolute left-1/2 top-5 -translate-x-1/2 text-base font-semibold text-foreground">
        {formatTimeRange(post.startTime, post.endTime)}
      </div>

      <header className="flex items-start gap-3 pt-8">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base font-medium text-primary">
          {initials || "?"}
        </div>

        <div className="min-w-0 flex-1 pt-1.5">
          <p className="truncate text-base font-semibold text-foreground">
            {author?.name ?? "…"}
          </p>

          <p className="truncate text-sm text-muted-foreground">
            @{author?.username ?? "user"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-1">
          <div className="origin-right scale-125">
            <StatusBadge status={post.status} size="sm" />
          </div>

          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-primary-soft"
                  aria-label="Post actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
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
        </div>
      </header>

      {post.message && (
        <p className="mt-4 text-[17px] leading-snug text-foreground">
          {post.message}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 text-right">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{audienceLabel}</span>
        </div>
      </div>

      {(participantCount > 0 || imDown) && (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>
            {participantCount} down
            {imDown && (
              <span className="ml-1 font-medium text-primary">
                · You're down
              </span>
            )}
          </span>
        </div>
      )}
    </article>
  );
}