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
//
// responderCoords is live (it moves with the responder), but the route is
// requested from a rate-limited origin (useRouteOrigin) -- re-fetched once
// the responder is ~30 m from where the current route starts and 10 s have
// passed, never on every location update. `originKey` names whose route it
// is; changing it (track-responder switching responders) re-routes at once.
import { useCallback, useState } from "react";

import { useRouteOrigin } from "@/hooks/useRouteOrigin";
import { useRoutesWithStatus } from "@/hooks/useRoutes";
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
  originKey?: string,
  // False holds the current route as-is -- no re-requests -- while the live
  // position keeps flowing to everything else (midpoint, markers). For a
  // map that's hidden under another screen showing the same route (e.g.
  // OnTheWayView under NavigateScreen), so the two don't both call the
  // Directions API. Turning it back on catches up immediately if the
  // responder has moved past the usual ~30 m / 10 s.
  routingEnabled: boolean = true,
): {
  route: Route | null;
  routes: Route[];
  selectedRouteIndex: number;
  selectRoute: (index: number) => void;
  midpoint: Coordinates | undefined;
  durationMin: number;
  distanceKm: number | undefined;
  // True while a newly selected travel mode's route is loading and the
  // previous mode's road route is still on hand (previousModeRoute). A
  // screen with a mode toggle shows that route dimmed and quotes no ETA:
  // durationMin/distanceKm are only the fallback estimates meanwhile, not
  // figures for the selected mode.
  modeLoading: boolean;
  previousModeRoute: Route | null;
} {
  // useRouteOrigin keeps its last origin while given no position, so the
  // route below simply isn't re-requested while routing is paused.
  const routeOrigin = useRouteOrigin(routingEnabled ? responderCoords : undefined, originKey);
  const { routes, previousModeRoutes } = useRoutesWithStatus(routeOrigin, incidentCoords, profile);
  // The pick is remembered together with the travel mode it was made in.
  // Switching mode makes it meaningless -- land back on the primary/fastest
  // route. A plain refresh (the responder moved on) keeps the chosen
  // alternative while it still exists, so the route a responder picked
  // doesn't snap back to the primary every ~30 m.
  const [choice, setChoice] = useState<{ profile: TravelProfile; index: number }>({ profile, index: 0 });
  const selectRoute = useCallback((index: number) => setChoice({ profile, index }), [profile]);

  const chosenIndex = choice.profile === profile ? choice.index : 0;
  const selectedRouteIndex = chosenIndex < routes.length ? chosenIndex : 0;
  const route = routes[selectedRouteIndex] ?? null;

  const midpoint =
    responderCoords && incidentCoords
      ? {
          latitude: (responderCoords.latitude + incidentCoords.latitude) / 2,
          longitude: (responderCoords.longitude + incidentCoords.longitude) / 2,
        }
      : undefined;

  const previousModeRoute = routes.length === 0 ? (previousModeRoutes[0] ?? null) : null;
  const modeLoading = previousModeRoute !== null;

  const durationMin = route?.durationMin ?? fallbackEtaMinutes ?? 6;
  const distanceKm = route?.distanceKm ?? fallbackDistanceKm;

  return {
    route,
    routes,
    selectedRouteIndex,
    selectRoute,
    midpoint,
    durationMin,
    distanceKm,
    modeLoading,
    previousModeRoute,
  };
}
