// hooks/useRoutes.ts
// Same fetch-once-per-distinct-key idiom as useRoute.ts, but exposes every
// route alternative Mapbox returned (primary first) instead of collapsing
// to just one -- lets a caller offer route choices, e.g. tapping a
// duration pill on an alternate route to make it the active one.
import { useEffect, useRef, useState } from "react";

import { getRoutes, type Route, type TravelProfile } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";

function keyOf(a: Coordinates, b: Coordinates, profile: TravelProfile): string {
  return `${a.latitude},${a.longitude}|${b.latitude},${b.longitude}|${profile}`;
}

export function useRoutes(
  origin: Coordinates | undefined,
  destination: Coordinates | undefined,
  profile: TravelProfile,
): Route[] {
  const [routes, setRoutes] = useState<Route[]>([]);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!origin || !destination) return;

    const key = keyOf(origin, destination, profile);
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    let cancelled = false;
    getRoutes(origin, destination, profile).then((result) => {
      if (!cancelled) setRoutes(result);
    });

    return () => {
      cancelled = true;
    };
  }, [origin, destination, profile]);

  return routes;
}
