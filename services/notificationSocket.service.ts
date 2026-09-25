// services/notificationSocket.service.ts
// Receive-only Socket.IO client for one user's own notification feed --
// mirrors responder/services/incidentSocket.service.ts's pattern, but joins
// no room explicitly since the server auto-joins every authenticated socket
// to its own user:<id> room (see backend realtime/socket.ts).
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/services/api";
import type { AppNotification } from "@/services/notification.service";

export function connectToNotificationSocket(
  token: string,
  onNew: (notification: AppNotification) => void,
  onReconnect?: () => void,
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

  return () => {
    socket.off("connect", handleConnect);
    socket.off("notification:new", onNew);
    socket.disconnect();
  };
}
