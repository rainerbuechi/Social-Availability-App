import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Eye,
  EyeOff,
  Clock,
  Users,
  Send,
} from "lucide-react";
import {
  AvailabilityPost,
  FriendGroup,
  PostParticipation,
  User,
} from "@/lib/types";
import { formatTimeRange, relativeTime } from "@/lib/status";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPost,
  getUser,
  listGroups,
  getCurrentUser,
  listPostParticipants,
  joinPost,
  leavePost,
  isCurrentUserParticipating,
  getParticipantCount,
} from "@/lib/api";

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<AvailabilityPost | null>(null);
  const [author, setAuthor] = useState<User | undefined>();
  const [group, setGroup] = useState<FriendGroup | undefined>();
  const [participants, setParticipants] = useState<
    (PostParticipation & { user?: User })[]
  >([]);
  const [isDown, setIsDown] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [responseMsg, setResponseMsg] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    if (!postId) return;

    const [p, me] = await Promise.all([getPost(postId), getCurrentUser()]);

    setCurrentUser(me);

    if (!p) {
      setPost(null);
      setLoading(false);
      return;
    }

    setPost(p);

    const [a, gs, parts, participating, cnt] = await Promise.all([
      getUser(p.authorId),
      listGroups(),
      listPostParticipants(postId),
      isCurrentUserParticipating(postId),
      getParticipantCount(postId),
    ]);

    setAuthor(a);
    setGroup(gs.find((g) => g.id === p.visibleToGroupId));
    setIsDown(participating);
    setCount(cnt);

    const withUsers = await Promise.all(
      parts.map(async (pp) => ({
        ...pp,
        user: await getUser(pp.userId),
      })),
    );

    setParticipants(withUsers);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleJoin = async () => {
    if (!postId) return;

    if (showInput) {
      await joinPost(postId, responseMsg.trim() || undefined);
      setShowInput(false);
      setResponseMsg("");
      refresh();
    } else {
      setShowInput(true);
    }
  };

  const handleQuickJoin = async () => {
    if (!postId) return;

    await joinPost(postId);
    refresh();
  };

  const handleLeave = async () => {
    if (!postId) return;

    await leavePost(postId);
    refresh();
  };

  const initials = (name?: string) =>
    name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const locationLabel = (() => {
    if (!post) return "";
    if (post.locationPrecision === "hidden" || !post.locationName) {
      return "Location hidden";
    }
    if (post.locationPrecision === "approximate") {
      return `Near ${post.locationName}`;
    }
    return post.locationName;
  })();

  if (loading) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-muted/20">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-muted/20">
        <div className="no-scrollbar flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6">
          <p className="text-lg font-medium text-foreground">Post not found</p>

          <p className="text-sm text-muted-foreground">
            It may have been deleted.
          </p>

          <Button variant="outline" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const isAuthor = currentUser?.id === post.authorId;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      <header className="safe-top shrink-0 border-b border-border bg-background/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="truncate text-lg font-semibold">Post Details</h1>
        </div>
      </header>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 pb-28">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
            {initials(author?.name)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-foreground">
              {author?.name ?? "…"}
            </p>

            <p className="truncate text-sm text-muted-foreground">
              @{author?.username} · {relativeTime(post.createdAt)}
            </p>
          </div>

          <StatusBadge status={post.status} />
        </div>

        {post.message && (
          <p className="text-[15px] leading-relaxed text-foreground">
            {post.message}
          </p>
        )}

        <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTimeRange(post.startTime, post.endTime)}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            {post.locationPrecision === "hidden" ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}

            <span>{locationLabel}</span>
          </div>

          {group && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>
                {group.emoji} {group.name}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Host
          </p>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initials(author?.name)}
            </div>

            <span className="text-sm font-medium text-foreground">
              {author?.name}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              People who are down
            </p>

            <span className="text-xs text-muted-foreground">
              <Users className="mr-1 inline h-3.5 w-3.5" />
              {count}
            </span>
          </div>

          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one yet — be the first!
            </p>
          ) : (
            <div className="space-y-3">
              {participants.map((pp) => (
                <div key={pp.id} className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {initials(pp.user?.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {pp.user?.name ?? "Unknown"}

                      {pp.userId === currentUser?.id && (
                        <span className="ml-1 text-xs text-primary">
                          (you)
                        </span>
                      )}
                    </p>

                    {pp.responseMessage && (
                      <p className="text-xs text-muted-foreground">
                        "{pp.responseMessage}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isAuthor && (
          <div className="space-y-2">
            {isDown ? (
              <Button
                variant="outline"
                className="h-11 w-full rounded-full border-border bg-card hover:bg-primary-soft/70 hover:text-primary"
                onClick={handleLeave}
              >
                Leave — I'm no longer down
              </Button>
            ) : showInput ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Add a note (optional)"
                  maxLength={80}
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  className="h-10 flex-1 rounded-full bg-card focus-visible:ring-[#DA2C43]"
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />

                <Button
                  onClick={handleJoin}
                  size="icon"
                  className="shrink-0 rounded-full bg-[#DA2C43] text-white hover:bg-[#c9273c]"
                >
                  <Send className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleQuickJoin}
                  className="shrink-0 rounded-full"
                >
                  Skip
                </Button>
              </div>
            ) : (
              <Button
                className="h-11 w-full rounded-full bg-[#DA2C43] font-semibold text-white hover:bg-[#c9273c]"
                onClick={handleJoin}
              >
                🤙 I'm down!
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}