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
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-background">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
        <div className="mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur">
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
        </div>
      </nav>
    </div>
  );
}