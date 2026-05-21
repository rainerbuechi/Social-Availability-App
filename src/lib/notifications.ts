/**
 * Push-notification helpers.
 *
 * subscribeToPush  – request permission → subscribe → store in Supabase
 * unsubscribeFromPush – unsubscribe device → remove from Supabase
 * sendNotification – fire-and-forget call to /api/send-notification
 */
import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/** Convert the URL-safe Base64 VAPID key to Uint8Array for the browser API. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** True if this browser / OS supports Web Push. */
export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Request permission, subscribe the device, and save the subscription in
 * Supabase. Returns true on success, false if the user denied permission.
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn("VITE_VAPID_PUBLIC_KEY not set");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;

    // Re-use an existing subscription if present
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }

    // Upsert into Supabase (one row per user)
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: userId, subscription: subscription.toJSON() },
      { onConflict: "user_id" },
    );
    if (error) console.error("save subscription:", error);

    return true;
  } catch (err) {
    console.error("subscribeToPush:", err);
    return false;
  }
}

/**
 * Unsubscribe this device and remove the record from Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId);
  } catch (err) {
    console.error("unsubscribeFromPush:", err);
  }
}

/**
 * Fire-and-forget: ask the server to push a notification to a list of users.
 * Called from api.ts after actions; does NOT block the caller.
 */
export function sendNotification(
  userIds: string[],
  title: string,
  body: string,
  url = "/",
  tag?: string,
): void {
  if (!userIds.length) return;

  fetch("/api/send-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds, title, body, url, tag }),
  }).catch(() => {});
}