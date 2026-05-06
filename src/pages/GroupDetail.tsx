import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, ChevronRight } from "lucide-react";
import { getGroup, listGroupMembers, listPostsByGroup, getRecentMessagesForGroup, getUser } from "@/lib/api";
import { AvailabilityPost, ChatMessage, FriendGroup, User } from "@/lib/types";
import { relativeTime } from "@/lib/status";
import PostCard from "@/components/PostCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<FriendGroup | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [posts, setPosts] = useState<AvailabilityPost[]>([]);
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([]);
  const [messageAuthors, setMessageAuthors] = useState<Record<string, string>>({});

  const refresh = async () => {
    if (!groupId) return;
    const [g, m, p, msgs] = await Promise.all([
      getGroup(groupId),
      listGroupMembers(groupId),
      listPostsByGroup(groupId),
      getRecentMessagesForGroup(groupId, 3),
    ]);
    if (!g) { navigate("/groups"); return; }
    setGroup(g);
    setMembers(m);
    setPosts(p);
    setRecentMessages(msgs);

    // Resolve author names for messages
    const authorMap: Record<string, string> = {};
    for (const msg of msgs) {
      if (!authorMap[msg.authorId]) {
        const u = await getUser(msg.authorId);
        authorMap[msg.authorId] = u?.name ?? "Unknown";
      }
    }
    setMessageAuthors(authorMap);
  };

  useEffect(() => { refresh(); }, [groupId]);

  if (!group) return null;

  return (
    <div>
      {/* Header */}
      <header className="safe-top sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate("/groups")}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {group.emoji} {group.name}
          </h1>
          <p className="text-xs text-muted-foreground">{members.length} members</p>
        </div>
        <button
          onClick={() => navigate(`/groups/${groupId}/chat`)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Chat"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </header>

      {/* Members */}
      <section className="border-b border-border p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Members</h2>
        <div className="flex flex-wrap gap-2">
          {members.map((u) => {
            const initials = u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div
                key={u.id}
                className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {initials}
                </div>
                <span className="text-secondary-foreground">{u.name}</span>
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">No members yet</p>
          )}
        </div>
      </section>

      {/* Chat Preview Widget */}
      <section className="p-4">
        <Card
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => navigate(`/groups/${groupId}/chat`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Chat</CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>View all</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentMessages.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground text-center">
                No messages yet. Start the chat.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium truncate">
                          {messageAuthors[msg.authorId] ?? "…"}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {relativeTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{msg.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <section className="px-4 pb-4">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h2>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No posts in this group yet</p>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} onDeleted={refresh} />)
          )}
        </div>
      </section>
    </div>
  );
}
