// utils/routeRequests.ts
// Pure state logic behind hooks/useRoutes.ts: which Directions response is
// allowed to replace the route on screen. A moving user re-requests the
// route as their origin moves (hooks/useRouteOrigin.ts), so responses can
// overlap -- only the newest request's answer may land, and a failed
// recalculation must not wipe the last good route for the same trip.
import type { Route, TravelProfile } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";
import { isValidCoordinate } from "@/utils/liveTracking";

export type RouteStatus = "idle" | "ok" | "failed";

export type RoutesState = {
  // Destination + travel mode the routes belong to (routeTargetKey).
  targetKey: string | null;
  routes: Route[];
  // "failed": the latest request returned nothing. `routes` may still hold
  // the previous good route for this same target -- callers say so.
  status: RouteStatus;
};

export const INITIAL_ROUTES_STATE: RoutesState = { targetKey: null, routes: [], status: "idle" };

export type RouteResponse = { seq: number; targetKey: string; routes: Route[] };

// The trip, independent of where it currently starts from.
export function routeTargetKey(destination: Coordinates, profile: TravelProfile): string {
  return `${destination.latitude},${destination.longitude}|${profile}`;
}

// Whether two trips (routeTargetKey) go to the same place -- e.g. the same
// destination by a different travel mode.
export function sameDestination(a: string, b: string): boolean {
  return a.slice(0, a.lastIndexOf("|")) === b.slice(0, b.lastIndexOf("|"));
}

// A route is only ever requested from (or to) a real position.
export function isRoutableCoordinate(coords: Coordinates | undefined): coords is Coordinates {
  return coords !== undefined && isValidCoordinate(coords);
}

export function applyRouteResponse(
  current: RoutesState,
  response: RouteResponse,
  latestSeq: number,
): RoutesState {
  // A newer request is already out -- this answer is for a stale origin or
  // target, so it never replaces anything.
  if (response.seq !== latestSeq) return current;

  if (response.routes.length > 0) {
    return { targetKey: response.targetKey, routes: response.routes, status: "ok" };
  }

  // Failed (getRoutes never throws; it returns [] on any failure). Keep the
  // last good route of the same trip rather than replacing it with nothing;
  // a different trip's route is never kept.
  if (current.targetKey === response.targetKey && current.routes.length > 0) {
    return { ...current, status: "failed" };
  }
  return { targetKey: response.targetKey, routes: [], status: "failed" };
}
