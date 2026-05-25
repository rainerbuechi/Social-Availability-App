import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Home, PlusCircle, Users, User, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

const tabs = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/create", label: "Post", icon: PlusCircle },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

export default function AppLayout() {
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadPendingFriendRequests() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;

      if (!userId) {
        if (isMounted) setPendingFriendRequests(0);
        return;
      }

      const { count, error } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("to_id", userId)
        .eq("status", "pending");

      if (error) {
        console.error(error);
        return;
      }

      if (isMounted) {
        setPendingFriendRequests(count ?? 0);
      }
    }

    async function setupRealtime() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;

      if (!userId) return;

      channel = supabase
        .channel(`friend-request-tab-badge-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friendships",
            filter: `to_id=eq.${userId}`,
          },
          () => {
            loadPendingFriendRequests();
          },
        )
        .subscribe();
    }

    const refreshBadge = () => {
      loadPendingFriendRequests();
    };

    loadPendingFriendRequests();
    setupRealtime();

    window.addEventListener("focus", refreshBadge);
    window.addEventListener("friend-requests-changed", refreshBadge);

    return () => {
      isMounted = false;

      window.removeEventListener("focus", refreshBadge);
      window.removeEventListener("friend-requests-changed", refreshBadge);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="mx-auto flex h-screen w-full max-w-md flex-col overflow-hidden bg-background shadow-xl">
        <main className="min-h-0 flex-1 overflow-hidden pb-24">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-4 z-50 px-4">
          <div className="mx-auto w-full max-w-[calc(28rem-2rem)] rounded-3xl border border-border bg-card/95 shadow-xl backdrop-blur">
            <ul className="grid grid-cols-5 px-1 py-2">
              {tabs.map(({ to, label, icon: Icon }) => {
                const showProfileBadge =
                  to === "/profile" && pendingFriendRequests > 0;

                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          "relative flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium transition-colors",
                          isActive
                            ? "text-[#DA2C43]"
                            : "text-muted-foreground hover:text-primary",
                        )
                      }
                    >
                      <span className="relative">
                        <Icon className="h-5 w-5" />

                        {showProfileBadge && (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-[#DA2C43]" />
                        )}
                      </span>

                      <span>{label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}