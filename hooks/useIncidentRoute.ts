// hooks/useIncidentRoute.ts
// Derives the route/midpoint/ETA data shared by the responder's live
// tracking views (OnTheWayView, responder/screens/NavigateScreen.tsx,
// app/track-responder/[id].tsx) from a responder<->incident coordinate
// pair. Callers own fetching responderCoords themselves (their
// loading/retry needs differ), this hook only covers the derived-data
// logic that's identical either way.
//
// Fetches every route alternative (via useRoutes) and tracks which one is
// selected -- `route` is always routes[selectedRouteIndex], so callers that
// never look at `routes`/`selectRoute` (OnTheWayView, track-responder) see
// no behavior change at all: they still just get one route, the primary
// one Mapbox recommends.
import { useEffect, useState } from "react";

import { useRoutes } from "@/hooks/useRoutes";
import type { Route, TravelProfile } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";

export function useIncidentRoute(
  responderCoords: Coordinates | undefined,
  incidentCoords: Coordinates | undefined,
  fallbackEtaMinutes: number | undefined,
  fallbackDistanceKm: number | undefined,
  // Defaults to "driving" -- track-responder/[id].tsx doesn't pass this and
  // keeps its existing driving-only behavior.
  profile: TravelProfile = "driving",
): {
  route: Route | null;
  routes: Route[];
  selectedRouteIndex: number;
  selectRoute: (index: number) => void;
  midpoint: Coordinates | undefined;
  durationMin: number;
  distanceKm: number | undefined;
} {
  const routes = useRoutes(responderCoords, incidentCoords, profile);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // A fresh route set (profile switched, or a new fetch resolved) makes
  // whatever was selected in the old set meaningless -- always land back on
  // the primary/fastest route rather than an index that might not even
  // exist in the new array.
  useEffect(() => {
    setSelectedRouteIndex(0);
  }, [routes]);

  const route = routes[selectedRouteIndex] ?? null;

  const midpoint =
    responderCoords && incidentCoords
      ? {
          latitude: (responderCoords.latitude + incidentCoords.latitude) / 2,
          longitude: (responderCoords.longitude + incidentCoords.longitude) / 2,
        }
      : undefined;

  const durationMin = route?.durationMin ?? fallbackEtaMinutes ?? 6;
  const distanceKm = route?.distanceKm ?? fallbackDistanceKm;

  return {
    route,
    routes,
    selectedRouteIndex,
    selectRoute: setSelectedRouteIndex,
    midpoint,
    durationMin,
    distanceKm,
  };
}
