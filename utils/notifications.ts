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
