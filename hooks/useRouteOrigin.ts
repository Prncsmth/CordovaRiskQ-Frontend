// hooks/useRouteOrigin.ts
// Turns a live, frequently-updating position into the origin a route is
// requested from, so a moving responder's route keeps following them
// without a Directions API call on every location update: the origin only
// moves once the live position is ROUTE_MIN_MOVE_METERS away from it AND
// ROUTE_MIN_INTERVAL_MS has passed since the last move (see
// routeOriginDecision in utils/liveTracking.ts). A new `key` (e.g. the
// citizen switching to another responder) re-routes immediately.
import { useEffect, useRef, useState } from "react";

import type { Coordinates } from "@/services/location.service";
import { routeOriginDecision, type RouteOriginRecord } from "@/utils/liveTracking";

export function useRouteOrigin(
  coords: Coordinates | undefined,
  key?: string,
): Coordinates | undefined {
  const [origin, setOrigin] = useState<Coordinates | undefined>(coords);
  const lastRef = useRef<RouteOriginRecord | null>(null);

  const latitude = coords?.latitude;
  const longitude = coords?.longitude;

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;
    const next = { latitude, longitude };

    const commit = () => {
      lastRef.current = { coords: next, at: Date.now(), key };
      setOrigin(next);
    };

    const decision = routeOriginDecision(lastRef.current, next, key, Date.now());
    if (decision.action === "update") {
      commit();
      return;
    }
    if (decision.action === "wait") {
      // Moved far enough but too soon -- route from wherever they are once
      // the interval is up, unless a newer position replaces this one
      // first (cleanup cancels it and that position is decided afresh).
      const timer = setTimeout(commit, decision.retryInMs);
      return () => clearTimeout(timer);
    }
  }, [latitude, longitude, key]);

  return origin;
}
