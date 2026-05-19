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
import { formatTimeRange, getActivityMeta } from "@/lib/status";
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

  const activity = getActivityMeta(post.status);

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
      className="cursor-pointer rounded-[1.65rem] border border-border/70 bg-card/95 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-md"
      onClick={() => navigate(`/posts/${post.id}`)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg"
              style={{
                backgroundColor: `hsl(var(--${activity.colorVar}) / 0.10)`,
              }}
            >
              {activity.emoji}
            </span>

            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-tight text-foreground">
                {activity.label}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {author?.name ?? "…"}
                {author?.username ? ` · @${author.username}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-1">
          <div className="rounded-full bg-muted/70 px-2.5 py-1 text-xs font-bold text-foreground/80">
            {formatTimeRange(post.startTime, post.endTime)}
          </div>

          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Post actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4.5 w-4.5" />
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

      {post.message ? (
        <p className="mt-4 text-[16px] leading-snug text-foreground">
          {post.message}
        </p>
      ) : (
        <div className="mt-3" />
      )}

      <footer className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5 rounded-2xl bg-muted/50 px-3 py-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{locationLabel}</span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 rounded-2xl bg-muted/50 px-3 py-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{audienceLabel}</span>
          </div>
        </div>

        {(participantCount > 0 || imDown) && (
          <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold">{participantCount} down</span>

            {imDown && (
              <span className="font-bold text-[#DA2C43]">You're down</span>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}