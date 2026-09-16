// hooks/useResponderTracking.ts
// Polls GET /api/incidents/:id/tracking every 4s while the Track Responder
// screen is focused -- same useFocusEffect + setInterval idiom as the
// notification-badge poll in app/(tabs)/home.tsx. Stops immediately once the
// backend reports the tracking window has closed (incident resolved/
// cancelled) instead of continuing to poll a report that will keep 404ing.
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { getResponderTracking, type TrackingSnapshot } from "@/services/tracking.service";

const POLL_INTERVAL_MS = 4000;
const CLOCK_TICK_MS = 1000;
export const STALE_AFTER_SECONDS = 15;
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
    };

export function useResponderTracking(
  token: string | null,
  incidentId: string | undefined,
): TrackingState {
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
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

      const poll = () => {
        if (stopped) return;
        getResponderTracking(token, incidentId)
          .then((result) => {
            if (stopped) return;
            if (result.state === "ok") {
              setSnapshot(result.snapshot);
              setWaiting(false);
            } else if (result.state === "waiting") {
              setWaiting(true);
            } else {
              // "ended" or "forbidden" -- terminal, stop polling right away
              // rather than waiting for the next tick or screen blur.
              setTerminal(result.state);
              stopped = true;
              if (intervalId) clearInterval(intervalId);
            }
          })
          // Transient network/server failure -- keep last known state and
          // retry on the next tick, same best-effort handling as
          // pollUnread() in home.tsx.
          .catch(() => {});
      };

      poll();
      intervalId = setInterval(poll, POLL_INTERVAL_MS);

      return () => {
        stopped = true;
        if (intervalId) clearInterval(intervalId);
      };
    }, [token, incidentId]),
  );

  if (terminal) return { kind: terminal };
  if (!snapshot) return { kind: waiting ? "waiting" : "loading" };

  const updatedAtMs = snapshot.locationUpdatedAt ? new Date(snapshot.locationUpdatedAt).getTime() : null;
  const secondsSinceUpdate = updatedAtMs != null ? Math.max(0, Math.round((now - updatedAtMs) / 1000)) : null;
  const stale = secondsSinceUpdate != null && secondsSinceUpdate >= STALE_AFTER_SECONDS;
  const veryStale = secondsSinceUpdate != null && secondsSinceUpdate >= VERY_STALE_AFTER_SECONDS;

  return { kind: "live", snapshot, secondsSinceUpdate, stale, veryStale };
}
