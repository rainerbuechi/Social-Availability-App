import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Settings } from "lucide-react";
import { getGroup, listGroupMembers, listPostsByGroup } from "@/lib/api";
import { AvailabilityPost, FriendGroup, User } from "@/lib/types";
import PostCard from "@/components/PostCard";

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<FriendGroup | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [posts, setPosts] = useState<AvailabilityPost[]>([]);

  const refresh = async () => {
    if (!groupId) return;
    const [g, m, p] = await Promise.all([
      getGroup(groupId),
      listGroupMembers(groupId),
      listPostsByGroup(groupId),
    ]);
    if (!g) { navigate("/groups"); return; }
    setGroup(g);
    setMembers(m);
    setPosts(p);
  };

  useEffect(() => { refresh(); }, [groupId]);

  if (!group) return null;

  return (
    <div>
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
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
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

      {/* Posts visible to this group */}
      <section className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Activity</h2>
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
