import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Send,
  Users,
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
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useNicknames } from "@/hooks/useNicknames";
import {
  getCurrentUser,
  getParticipantCount,
  getPost,
  getUser,
  isCurrentUserParticipating,
  joinPost,
  leavePost,
  listGroups,
  listPostParticipants,
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
  const [isJoining, setIsJoining] = useState(false);
  const { displayName } = useNicknames();

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

  const { pullDistance, isRefreshing, isReady, pullHandlers } =
    usePullToRefresh({
      onRefresh: refresh,
    });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleJoin = async () => {
    if (!postId || isJoining) return;

    setIsJoining(true);

    try {
      if (showInput) {
        await joinPost(postId, responseMsg.trim() || undefined);
        setShowInput(false);
        setResponseMsg("");
        await refresh();
      } else {
        setShowInput(true);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleQuickJoin = async () => {
    if (!postId || isJoining) return;

    setIsJoining(true);

    try {
      await joinPost(postId);
      await refresh();
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!postId || isJoining) return;

    setIsJoining(true);

    try {
      await leavePost(postId);
      await refresh();
    } finally {
      setIsJoining(false);
    }
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
      return "Unknown location";
    }

    if (post.locationPrecision === "approximate") {
      return `Near ${post.locationName}`;
    }

    return post.locationName;
  })();

  const PullLoader = (
    <div
      className="pointer-events-none absolute left-0 right-0 top-3 z-20 flex justify-center transition-opacity duration-150"
      style={{
        opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
      }}
    >
      <div className="flex h-10 items-center gap-2 rounded-full bg-card px-3 text-xs font-semibold text-muted-foreground shadow-md">
        <Loader2
          className={`h-4 w-4 ${
            isRefreshing
              ? "animate-spin text-[#DA2C43]"
              : isReady
                ? "text-[#DA2C43]"
                : "text-muted-foreground"
          }`}
          style={{
            transform: isRefreshing
              ? undefined
              : `rotate(${Math.min(pullDistance * 5, 320)}deg)`,
          }}
        />

        <span>
          {isRefreshing
            ? "Refreshing..."
            : isReady
              ? "Release to refresh"
              : "Pull to refresh"}
        </span>
      </div>
    </div>
  );

  const contentTransform = {
    transform: `translateY(${pullDistance}px)`,
    transition: isRefreshing ? "transform 180ms ease" : undefined,
  };

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

      <div
        {...pullHandlers}
        className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden p-4 pb-28"
        style={{
          overscrollBehaviorY: "contain",
          touchAction: "pan-y",
        }}
      >
        {PullLoader}

        <div className="space-y-5" style={contentTransform}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              {initials(author?.name)}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">
                {author ? displayName(author.id, author.name) : "…"}
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

            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>
                {group ? `${group.emoji} ${group.name}` : "👥 All friends"}
              </span>
            </div>
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
                {author ? displayName(author.id, author.name) : "…"}
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
                        {pp.user ? displayName(pp.user.id, pp.user.name) : "Unknown"}

                        {pp.userId === currentUser?.id && (
                          <span className="ml-1 text-xs text-primary">
                            (you)
                          </span>
                        )}
                      </p>

                      {pp.responseMessage && (
                        <p className="text-xs text-muted-foreground">
                          “{pp.responseMessage}”
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
                  disabled={isJoining}
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
                    disabled={isJoining}
                    className="shrink-0 rounded-full bg-[#DA2C43] text-white hover:bg-[#c9273c]"
                  >
                    {isJoining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-border bg-card hover:bg-primary-soft/70 hover:text-primary"
                    onClick={handleJoin}
                    disabled={isJoining}
                  >
                    Add note
                  </Button>

                  <Button
                    className="h-11 rounded-full bg-[#DA2C43] text-white hover:bg-[#c9273c]"
                    onClick={handleQuickJoin}
                    disabled={isJoining}
                  >
                    I'm down
                  </Button>
                </div>
              )}
            </div>
          )}

          {isAuthor && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              This is your post.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}