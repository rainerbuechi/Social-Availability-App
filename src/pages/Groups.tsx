import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { listGroups, listUsers } from "@/lib/api";
import { FriendGroup, User } from "@/lib/types";
import { toast } from "sonner";

export default function Groups() {
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    listGroups().then(setGroups);
    listUsers().then(setUsers);
  }, []);

  const userById = (id: string) => users.find((u) => u.id === id);

  return (
    <div>
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <button
            onClick={() => toast("Group creation coming soon")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose who sees what you're up to.
        </p>
      </header>

      <ul className="space-y-3 p-4">
        {groups.map((g) => (
          <li
            key={g.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-xl">
                  {g.emoji}
                </div>
                <div>
                  <p className="text-base font-semibold">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.memberIds.length} member
                    {g.memberIds.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <button className="text-sm text-primary font-medium">
                Edit
              </button>
            </div>
            <div className="mt-3 flex -space-x-2">
              {g.memberIds.slice(0, 6).map((id) => {
                const u = userById(id);
                const initials = u?.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("");
                return (
                  <div
                    key={id}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-medium text-secondary-foreground"
                    title={u?.name}
                  >
                    {initials}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
