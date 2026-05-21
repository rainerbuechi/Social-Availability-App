/// <reference lib="WebWorker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// ── Push: show the notification ───────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json() as {
      title: string;
      body: string;
      url?: string;
      tag?: string;
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: payload.url ?? "/" },
        tag: payload.tag,
      }),
    );
  } catch {
    // ignore malformed push data
  }
});

// ── Notification click: open / focus the app ──────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url: string })?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const match = clients.find((c) => c.url.includes(url));
        if (match) return match.focus();
        return self.clients.openWindow(url);
      }),
  );
});