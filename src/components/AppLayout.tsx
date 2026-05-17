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
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>

        <nav className="safe-bottom shrink-0 border-t border-border bg-card/95 backdrop-blur">
          <ul className="grid grid-cols-5">
            {tabs.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                      isActive
                        ? "text-[#DA2C43]"
                        : "text-muted-foreground hover:text-primary",
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}