// services/trackingSocket.service.ts
// Receive-only Socket.IO client for the citizen's Track Responder(s) screen
// -- the fast path for responder movement. Joins the same incident:<id>
// room as responder/services/incidentSocket.service.ts (the backend lets an
// incident's own reporter in, via canViewIncident), and hears:
// - incident:responderLocation -- pushed on every responder location upload
//   ({ responderId, latitude, longitude, locationUpdatedAt });
// - incident:updated -- the roster/status changed (a responder joined,
//   headed out, arrived, left), so the caller can re-poll for names/statuses
//   right away instead of waiting for its next poll tick.
// The caller's existing poll of GET /api/incidents/:id/tracking stays as the
// backup path for a dropped socket.
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "@/services/api";
import type { ResponderLocationUpdate } from "@/utils/trackResponders";

function isLocationUpdate(value: unknown): value is ResponderLocationUpdate {
  const v = value as Partial<ResponderLocationUpdate> | null;
  return (
    !!v &&
    typeof v.responderId === "string" &&
    typeof v.latitude === "number" &&
    Number.isFinite(v.latitude) &&
    typeof v.longitude === "number" &&
    Number.isFinite(v.longitude) &&
    typeof v.locationUpdatedAt === "string"
  );
}

export function connectToTrackingSocket(
  token: string,
  incidentId: string,
  handlers: {
    onLocation: (update: ResponderLocationUpdate) => void;
    onRosterChange: () => void;
    // A reconnect after a drop -- anything pushed meanwhile was missed.
    onReconnect: () => void;
  },
): () => void {
  const socket: Socket = io(API_BASE_URL, {
    auth: { token },
  });

  let hasConnectedBefore = false;
  const join = () => {
    socket.emit("join:incident", { incidentId });
    if (hasConnectedBefore) handlers.onReconnect();
    hasConnectedBefore = true;
  };
  const handleLocation = (payload: unknown) => {
    if (isLocationUpdate(payload)) handlers.onLocation(payload);
  };
  const handleUpdated = () => handlers.onRosterChange();

  socket.on("connect", join);
  socket.on("incident:responderLocation", handleLocation);
  socket.on("incident:updated", handleUpdated);

  return () => {
    socket.off("connect", join);
    socket.off("incident:responderLocation", handleLocation);
    socket.off("incident:updated", handleUpdated);
    socket.disconnect();
  };
}
