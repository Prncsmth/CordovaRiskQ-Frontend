// services/evacuationCenterSocket.service.ts
// Receive-only Socket.IO client for evacuation center updates -- mirrors
// notificationSocket.service.ts's pattern, but joins no room since the
// server broadcasts these to every connected socket (see backend
// realtime/emit.ts's emitEvacuationCenterUpdated).
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/services/api";

export type EvacuationCenterUpdate = {
  id: string;
  status: "open" | "full";
  facilities: string[];
};

export function connectToEvacuationCenterSocket(
  token: string,
  onUpdate: (update: EvacuationCenterUpdate) => void,
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
  socket.on("evacuationCenter:updated", onUpdate);

  return () => {
    socket.off("connect", handleConnect);
    socket.off("evacuationCenter:updated", onUpdate);
    socket.disconnect();
  };
}
