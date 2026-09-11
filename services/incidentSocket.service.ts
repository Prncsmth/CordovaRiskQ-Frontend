// services/incidentSocket.service.ts
// Receive-only Socket.IO client for one incident's live roster/status
// updates. Actions (join/decline/head-out/arrive/cancel) stay on REST --
// this only listens for what other responders do. See
// docs/superpowers/specs/2026-09-08-active-incident-realtime-design.md.
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "./api";
import type { IncidentStatus, ResponderStatus } from "@/responder/types/responder";

// Deliberately has no myStatus field -- the server never broadcasts it,
// since it's per-viewer. See emitIncidentUpdate on the backend.
export interface IncidentRealtimeUpdate {
  id: string;
  status: IncidentStatus;
  responders: { id: string; name: string; status: ResponderStatus }[];
  respondersCount: number;
  acceptedByResponderId: string | null;
  updatedAt: string;
}

export function connectToIncidentSocket(
  token: string,
  incidentId: string,
  onUpdate: (update: IncidentRealtimeUpdate) => void,
  onReconnect?: () => void,
): () => void {
  const socket: Socket = io(API_BASE_URL, {
    auth: { token },
  });

  let hasConnectedBefore = false;
  const join = () => {
    socket.emit("join:incident", { incidentId });
    if (hasConnectedBefore) {
      onReconnect?.();
    }
    hasConnectedBefore = true;
  };

  socket.on("connect", join);
  socket.on("incident:updated", onUpdate);

  return () => {
    socket.off("connect", join);
    socket.off("incident:updated", onUpdate);
    socket.disconnect();
  };
}
