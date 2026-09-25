// services/hotlineSocket.service.ts
// Receive-only Socket.IO client for hotline updates -- mirrors
// evacuationCenterSocket.service.ts's pattern; no room join needed since the
// server broadcasts these to every connected socket (see backend
// realtime/emit.ts's emitHotlineUpdated).
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/services/api";
import type { HotlineCategory } from "@/services/contacts.service";

export type HotlineUpdate = {
  id: string;
  name: string;
  number: string;
  category: HotlineCategory;
};

export function connectToHotlineSocket(
  token: string,
  onUpdate: (update: HotlineUpdate) => void,
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
  socket.on("hotline:updated", onUpdate);

  return () => {
    socket.off("connect", handleConnect);
    socket.off("hotline:updated", onUpdate);
    socket.disconnect();
  };
}
