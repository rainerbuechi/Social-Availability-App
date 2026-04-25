import { NavLink, Outlet } from "react-router-dom";
import { Home, PlusCircle, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/create", label: "Post", icon: PlusCircle },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

export default function AppLayout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-background">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
        <div className="mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur">
          <ul className="grid grid-cols-4">
            {tabs.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
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
