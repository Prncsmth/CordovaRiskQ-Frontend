import type { AppNotification } from "@/services/notification.service";

// Merges a notification pushed live over the socket (see
// context/NotificationContext.tsx) into the already-fetched list. Guards
// against a duplicate if the same row also arrives via a reconnect refetch
// racing the live event.
export function addIncomingNotification(
  existing: AppNotification[],
  incoming: AppNotification,
): AppNotification[] {
  if (existing.some((n) => n.id === incoming.id)) {
    return existing;
  }
  return [incoming, ...existing];
}

// Responder notifications are an operational inbox: each one is listed for
// 24 hours from when it was created (read or not), then drops out of the
// list and the unread badge -- the backend applies the same cutoff on every
// fetch; this keeps an already-loaded list honest while the app stays open.
// Citizens keep their unexpiring list.
export const RESPONDER_NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function visibleNotifications(
  list: AppNotification[],
  role: string | undefined,
  now = Date.now(),
): AppNotification[] {
  if (role !== "responder") return list;
  return list.filter(
    (n) => now - new Date(n.createdAt).getTime() < RESPONDER_NOTIFICATION_TTL_MS,
  );
}

// When the newest "incident_status" notification was created (ms), or null
// if there is none. The backend sends one to the reporter every time their
// report's status changes (accepted, en route, arrived, resolved, ...), so
// Report History watches this to reload the moment a newer one arrives --
// deleting a notification can only move it backwards, never trigger a reload.
export function latestIncidentStatusAt(list: AppNotification[]): number | null {
  let latest: number | null = null;
  for (const n of list) {
    if (n.type !== "incident_status") continue;
    const at = Date.parse(n.createdAt);
    if (Number.isFinite(at) && (latest === null || at > latest)) latest = at;
  }
  return latest;
}

// Marks one notification read in an already-loaded list, keeping it listed.
export function withNotificationRead(list: AppNotification[], id: string): AppNotification[] {
  return list.map((n) => (n.id === id ? { ...n, read: true } : n));
}
