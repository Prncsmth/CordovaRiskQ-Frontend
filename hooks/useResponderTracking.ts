// hooks/useResponderTracking.ts
// Live responder positions for the Track Responder(s) screen while it's
// focused. Two paths feed the same state:
// - Socket.IO (services/trackingSocket.service.ts) -- the fast path. Each
//   incident:responderLocation push updates just that responder, by ID,
//   within a moment of the responder's upload;
// - polling GET /api/incidents/:id/tracking every 4s -- the backup, and the
//   source of the roster (who's helping, names, statuses, ETAs). Same
//   useFocusEffect + setInterval idiom as the notification-badge poll in
//   app/(tabs)/home.tsx. A roster change pushed over the socket triggers an
//   immediate poll.
// Both go through trackingReducer (utils/trackResponders.ts), which also
// keeps each responder's own driving/walking state. Stops polling and
// disconnects once the backend reports the tracking window has closed
// (incident resolved/cancelled) instead of continuing to poll a report that
// will keep 404ing.
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useFocusEffect } from "expo-router";

import { getResponderTracking, type TrackingSnapshot } from "@/services/tracking.service";
import { connectToTrackingSocket } from "@/services/trackingSocket.service";
import type { MovementMode } from "@/utils/responderMovement";
import { INITIAL_TRACKING_DATA, movementModes, trackingReducer } from "@/utils/trackResponders";

const POLL_INTERVAL_MS = 4000;
const CLOCK_TICK_MS = 1000;
// A stationary responder re-sends their position every 15 s (plus up to one
// 3 s upload tick and the network), so a healthy-but-parked responder
// would otherwise flash "Updating location…" every cycle at 15 s.
export const STALE_AFTER_SECONDS = 20;
export const VERY_STALE_AFTER_SECONDS = 30;

export type TrackingState =
  | { kind: "loading" }
  | { kind: "waiting" }
  | { kind: "ended" }
  | { kind: "forbidden" }
  | {
      kind: "live";
      snapshot: TrackingSnapshot;
      secondsSinceUpdate: number | null;
      stale: boolean;
      veryStale: boolean;
      // The ticking clock, so a caller showing a different responder than
      // the first one (Track Responders) can work out that responder's
      // freshness with locationFreshness().
      now: number;
      // Driving or walking, per responder ID.
      movement: Record<string, MovementMode>;
    };

export type LocationFreshness = {
  secondsSinceUpdate: number | null;
  stale: boolean;
  veryStale: boolean;
};

// How fresh one responder's last known location is, as of `now`.
export function locationFreshness(locationUpdatedAt: string | null, now: number): LocationFreshness {
  const updatedAtMs = locationUpdatedAt ? new Date(locationUpdatedAt).getTime() : null;
  const secondsSinceUpdate =
    updatedAtMs != null && Number.isFinite(updatedAtMs)
      ? Math.max(0, Math.round((now - updatedAtMs) / 1000))
      : null;
  return {
    secondsSinceUpdate,
    stale: secondsSinceUpdate != null && secondsSinceUpdate >= STALE_AFTER_SECONDS,
    veryStale: secondsSinceUpdate != null && secondsSinceUpdate >= VERY_STALE_AFTER_SECONDS,
  };
}

export function useResponderTracking(
  token: string | null,
  incidentId: string | undefined,
): TrackingState {
  const [data, dispatch] = useReducer(trackingReducer, INITIAL_TRACKING_DATA);
  const snapshot: TrackingSnapshot | null = data.snapshot;
  const movement = useMemo(() => movementModes(data.movement), [data.movement]);
  const [waiting, setWaiting] = useState(false);
  const [terminal, setTerminal] = useState<"ended" | "forbidden" | null>(null);
  // Ticks once a second so "Last updated Xs ago" keeps advancing between
  // poll ticks, not just when a new snapshot arrives.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!token || !incidentId) return;
      let stopped = false;
      let intervalId: ReturnType<typeof setInterval> | null = null;
      let disconnect: (() => void) | null = null;

      const stop = () => {
        stopped = true;
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        disconnect?.();
        disconnect = null;
      };

      const poll = () => {
        if (stopped) return;
        getResponderTracking(token, incidentId)
          .then((result) => {
            if (stopped) return;
            if (result.state === "ok") {
              dispatch({ type: "snapshot", snapshot: result.snapshot });
              setWaiting(false);
            } else if (result.state === "waiting") {
              setWaiting(true);
            } else {
              // "ended" or "forbidden" -- terminal, stop polling (and drop
              // the socket) right away rather than waiting for the next tick
              // or screen blur.
              setTerminal(result.state);
              stop();
            }
          })
          // Transient network/server failure -- keep last known state and
          // retry on the next tick, same best-effort handling as
          // pollUnread() in home.tsx.
          .catch(() => {});
      };

      // One socket per focus, torn down on blur -- never stacked.
      disconnect = connectToTrackingSocket(token, incidentId, {
        onLocation: (update) => {
          if (!stopped) dispatch({ type: "location", update });
        },
        onRosterChange: poll,
        onReconnect: poll,
      });

      poll();
      intervalId = setInterval(poll, POLL_INTERVAL_MS);

      return stop;
    }, [token, incidentId]),
  );

  if (terminal) return { kind: terminal };
  if (!snapshot) return { kind: waiting ? "waiting" : "loading" };

  const { secondsSinceUpdate, stale, veryStale } = locationFreshness(snapshot.locationUpdatedAt, now);

  return { kind: "live", snapshot, secondsSinceUpdate, stale, veryStale, now, movement };
}
