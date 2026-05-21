import type { VercelRequest, VercelResponse } from "@vercel/node";
import webPush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS so we can read any user's subscription
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT!,           // e.g. "mailto:you@example.com"
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { userIds, title, body, url = "/", tag } = req.body as {
    userIds: string[];
    title: string;
    body: string;
    url?: string;
    tag?: string;
  };

  if (!Array.isArray(userIds) || !userIds.length || !title || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, subscription")
    .in("user_id", userIds);

  if (error) {
    console.error("fetch subscriptions:", error);
    return res.status(500).json({ error: "DB error" });
  }
  if (!subs?.length) return res.status(200).json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url, tag });
  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async ({ user_id, subscription }) => {
      try {
        await webPush.sendNotification(
          subscription as webPush.PushSubscription,
          payload,
        );
      } catch (err: unknown) {
        // 410 Gone = subscription expired → clean it up
        if ((err as { statusCode?: number }).statusCode === 410) {
          staleIds.push(user_id as string);
        }
      }
    }),
  );

  if (staleIds.length) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("user_id", staleIds);
  }

  return res.status(200).json({ sent: subs.length - staleIds.length });
}