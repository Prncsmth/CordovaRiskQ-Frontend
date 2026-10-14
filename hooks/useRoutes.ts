// hooks/useRoutes.ts
// Same fetch-once-per-distinct-key idiom as useRoute.ts, but exposes every
// route alternative Mapbox returned (primary first) instead of collapsing
// to just one -- lets a caller offer route choices, e.g. tapping a
// duration pill on an alternate route to make it the active one.
//
// Built to be re-requested as the origin moves (hooks/useRouteOrigin.ts):
// - Every request is numbered and only the newest one's answer may land
//   (utils/routeRequests.ts), so an older, slower response can never
//   replace a newer route.
// - A request is NOT dropped just because the screen re-rendered: the
//   effect keys on the coordinate numbers, not the object identities, and
//   no longer cancels in-flight work on every render (it used to, which
//   lost the answer whenever anything re-rendered mid-request).
// - A failed recalculation keeps the last good route for the same
//   destination and mode instead of clearing it.
// - Nothing is requested from an invalid position.
import { useEffect, useRef, useState } from "react";

import { getRoutes, type Route, type TravelProfile } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";
import {
  INITIAL_ROUTES_STATE,
  applyRouteResponse,
  isRoutableCoordinate,
  routeTargetKey,
  sameDestination,
  type RouteStatus,
} from "@/utils/routeRequests";

// One shared empty list, so a caller depending on `routes` sees a stable
// value instead of a new array every render.
const NO_ROUTES: Route[] = [];

export function useRoutesWithStatus(
  origin: Coordinates | undefined,
  destination: Coordinates | undefined,
  profile: TravelProfile,
): {
  routes: Route[];
  status: RouteStatus;
  // While a new travel mode to the SAME destination is loading: the
  // previous mode's routes, so a screen can keep showing them as "previous
  // mode, loading" instead of a bare straight line. Never part of
  // `routes` -- they don't belong to the selected mode. Empty otherwise.
  previousModeRoutes: Route[];
} {
  const [state, setState] = useState(INITIAL_ROUTES_STATE);
  const lastKeyRef = useRef<string | null>(null);
  const latestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  const destLat = destination?.latitude;
  const destLng = destination?.longitude;

  useEffect(() => {
    if (originLat === undefined || originLng === undefined || destLat === undefined || destLng === undefined) {
      return;
    }
    const from = { latitude: originLat, longitude: originLng };
    const to = { latitude: destLat, longitude: destLng };
    if (!isRoutableCoordinate(from) || !isRoutableCoordinate(to)) return;

    const targetKey = routeTargetKey(to, profile);
    const key = `${originLat},${originLng}|${targetKey}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const seq = ++latestSeqRef.current;
    getRoutes(from, to, profile).then((routes) => {
      if (!mountedRef.current) return;
      setState((current) => applyRouteResponse(current, { seq, targetKey, routes }, latestSeqRef.current));
    });
  }, [originLat, originLng, destLat, destLng, profile]);

  // While a different destination/mode is being fetched, the previous
  // trip's routes no longer apply -- show none rather than the wrong trip.
  const currentTarget =
    destLat !== undefined && destLng !== undefined
      ? routeTargetKey({ latitude: destLat, longitude: destLng }, profile)
      : null;
  if (state.targetKey !== null && state.targetKey !== currentTarget) {
    const previousModeRoutes =
      currentTarget !== null && sameDestination(state.targetKey, currentTarget) ? state.routes : NO_ROUTES;
    return { routes: NO_ROUTES, status: "idle", previousModeRoutes };
  }
  return { routes: state.routes, status: state.status, previousModeRoutes: NO_ROUTES };
}

export function useRoutes(
  origin: Coordinates | undefined,
  destination: Coordinates | undefined,
  profile: TravelProfile,
): Route[] {
  return useRoutesWithStatus(origin, destination, profile).routes;
}
