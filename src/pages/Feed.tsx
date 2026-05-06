import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PostCard from "@/components/PostCard";
import { listFeed } from "@/lib/api";
import { AvailabilityPost } from "@/lib/types";

export default function Feed() {
  const [posts, setPosts] = useState<AvailabilityPost[]>([]);

  const refresh = useCallback(() => {
    listFeed().then(setPosts);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Down<span className="text-primary">?</span>
          </h1>
          <Link
            to="/create"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Post
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {posts.length} friends sharing right now
        </p>
      </header>

      <div className="space-y-3 p-4">
        {posts.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            No one's down yet. Be the first 👀
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} onDeleted={refresh} />)
        )}
      </div>
    </div>
  );
}
