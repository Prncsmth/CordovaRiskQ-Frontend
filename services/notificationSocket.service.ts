// services/notificationSocket.service.ts
// Receive-only Socket.IO client for one user's own notification feed --
// mirrors responder/services/incidentSocket.service.ts's pattern, but joins
// no room explicitly since the server auto-joins every authenticated socket
// to its own user:<id> room (see backend realtime/socket.ts).
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/services/api";
import type { AppNotification } from "@/services/notification.service";

export type AnnouncementDeletedEvent = { id: string };

export function connectToNotificationSocket(
  token: string,
  onNew: (notification: AppNotification) => void,
  onReconnect?: () => void,
  // Backend's realtime/emit.ts's emitAnnouncementDeleted -- broadcast to
  // every connected socket (not just this user's own room), same as
  // evacuationCenter:updated/hotline:updated, since an announcement isn't
  // scoped to one user. Optional so existing callers that don't care about
  // it don't have to pass a no-op.
  onAnnouncementDeleted?: (event: AnnouncementDeletedEvent) => void,
): () => void {
  const socket: Socket = io(API_BASE_URL, {
    auth: { token },
  });

  let hasConnectedBefore = false;
  const handleConnect = () => {
    if (hasConnectedBefore) {
      onReconnect?.();
    }
    hasConnectedBefore = true;
  };

  socket.on("connect", handleConnect);
  socket.on("notification:new", onNew);
  if (onAnnouncementDeleted) {
    socket.on("announcement:deleted", onAnnouncementDeleted);
  }

  return () => {
    socket.off("connect", handleConnect);
    socket.off("notification:new", onNew);
    if (onAnnouncementDeleted) {
      socket.off("announcement:deleted", onAnnouncementDeleted);
    }
    socket.disconnect();
  };
}
