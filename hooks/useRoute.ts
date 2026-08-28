// hooks/useRoute.ts
// Fetches a real route between two points via directions.service.ts, with
// exactly one request per distinct (origin, destination, profile) triple --
// guards against re-renders or effect re-runs re-firing the same request.
// Returns null until a route resolves, or if the fetch never succeeds
// (callers should fall back to a straight line in that case).
import { useEffect, useRef, useState } from "react";

import { getRoute, type Route, type TravelProfile } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";

function keyOf(a: Coordinates, b: Coordinates, profile: TravelProfile): string {
  return `${a.latitude},${a.longitude}|${b.latitude},${b.longitude}|${profile}`;
}

export function useRoute(
  origin: Coordinates | undefined,
  destination: Coordinates | undefined,
  profile: TravelProfile,
): Route | null {
  const [route, setRoute] = useState<Route | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!origin || !destination) return;

    const key = keyOf(origin, destination, profile);
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    let cancelled = false;
    getRoute(origin, destination, profile).then((result) => {
      if (!cancelled) setRoute(result);
    });

    return () => {
      cancelled = true;
    };
  }, [origin, destination, profile]);

  return route;
}
