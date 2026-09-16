// hooks/useLiveLocationUpload.ts
// Sends this responder's live GPS to PATCH /api/responders/location every
// 4s while `active` is true, so the citizen's Track Responder screen
// (services/tracking.service.ts -> GET /api/incidents/:id/tracking) has
// something fresh to poll. Owned by IncidentDetailScreen, gated on
// phase === "on_the_way" and the incident not yet closed -- that phase is
// already kept live there via the incident socket
// (connectToIncidentSocket), so this hook doesn't need its own polling to
// know when to stop; it just reacts to `active` flipping false.
import { useEffect, useRef } from "react";

import { updateResponderLocation } from "@/responder/services/incident.service";
import { getCurrentLocation, type Coordinates } from "@/services/location.service";
import { haversineDistanceKm } from "@/utils/distance";

const UPLOAD_INTERVAL_MS = 4000;
// Below this, a new GPS fix isn't worth an upload -- device GPS jitter alone
// can drift a stationary point a few meters between fixes, and the citizen
// screen doesn't need to see that noise.
const MOVE_THRESHOLD_METERS = 10;

export function useLiveLocationUpload(token: string | null, active: boolean): void {
  const lastSentRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (!active || !token) return;

    // Fresh window each time `active` turns true (e.g. re-entering
    // on_the_way after a resync) -- always send the first fix of a window
    // regardless of how close it is to wherever a previous window left off.
    lastSentRef.current = null;
    let cancelled = false;

    const tick = async () => {
      const fix = await getCurrentLocation();
      if (cancelled || !fix) return;

      const movedMeters = lastSentRef.current
        ? haversineDistanceKm(lastSentRef.current, fix) * 1000
        : Infinity;
      if (movedMeters < MOVE_THRESHOLD_METERS) return;

      try {
        await updateResponderLocation(token, fix);
        if (!cancelled) lastSentRef.current = fix;
      } catch {
        // Transient network/server failure (or a stale 403 the instant
        // eligibility ends) -- keep trying on the next tick instead of
        // crashing or blocking the UI. If eligibility has genuinely ended,
        // the caller's own `active` flag flips false on the next incident
        // update and this effect tears itself down anyway.
      }
    };

    tick();
    const interval = setInterval(tick, UPLOAD_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active, token]);
}
