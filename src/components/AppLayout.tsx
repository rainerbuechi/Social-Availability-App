import { NavLink, Outlet } from "react-router-dom";
import { Home, PlusCircle, Users, User, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/create", label: "Post", icon: PlusCircle },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-200">
      <div className="mx-auto flex h-screen w-full max-w-md flex-col overflow-hidden bg-background shadow-xl">
        <main className="min-h-0 flex-1 overflow-hidden pb-24">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-4 z-50 px-4">
          <div className="mx-auto w-full max-w-[calc(28rem-2rem)] rounded-3xl border border-border bg-card/95 shadow-xl backdrop-blur">
            <ul className="grid grid-cols-5 px-1 py-2">
              {tabs.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        "flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium transition-colors",
                        isActive
                          ? "text-[#DA2C43]"
                          : "text-muted-foreground hover:text-primary",
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}