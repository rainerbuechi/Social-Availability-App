import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useNicknames() {
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user?.id ?? null;
      setMeId(id);
      if (id) {
        const stored = localStorage.getItem(`nicknames_${id}`);
        setNicknames(stored ? JSON.parse(stored) : {});
      }
    });
  }, []);

  const displayName = (profileId: string, fallback: string): string =>
    nicknames[profileId] ?? fallback;

  return { displayName, meId };
}