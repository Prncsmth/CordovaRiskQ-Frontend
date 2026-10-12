// utils/liveTracking.ts
// Pure timing/distance rules behind live responder tracking, kept free of
// React and timers so they're unit-tested directly:
// - when the responder app uploads a GPS fix (hooks/useLiveLocationUpload.ts);
// - when a map re-requests a route from a moving origin
//   (hooks/useRouteOrigin.ts);
// - how a responder marker glides between two positions
//   (components/map/ResponderMarker.tsx).
import type { Coordinates } from "@/services/location.service";
import { haversineDistanceKm } from "@/utils/distance";

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  return haversineDistanceKm(a, b) * 1000;
}

// ---- Upload cadence -------------------------------------------------------

// How often the responder app considers uploading the latest GPS fix --
// with the 1 s / 2 m GPS stream, a moving responder's marker updates every
// ~2 s, so tracking reads as live.
export const UPLOAD_INTERVAL_MS = 2000;
// Below this, a new fix isn't worth an upload -- device GPS jitter alone can
// drift a stationary point a meter or two between fixes. Kept tiny so even
// a few steps on foot (~1.4 m/s) move the marker within a couple of seconds.
export const MOVE_THRESHOLD_METERS = 2;
// A stationary responder still re-sends their position this often, so the
// citizen's "Updated Xs ago" doesn't keep growing while they wait at a
// junction or on scene.
export const CHECK_IN_INTERVAL_MS = 10_000;
// A fix only counts as movement once it's farther from the last sent spot
// than the GPS's own reported accuracy -- so a parked phone's jitter doesn't
// walk its marker around. Capped low (it used to be 50 m, which held a
// walking responder's marker still for ~35 s under a poor fix): past 5 m
// it's treated as real movement, trading a little marker drift when parked
// under a poor fix for a live marker on the move.
export const MAX_ACCURACY_THRESHOLD_METERS = 5;

export function movementThresholdMeters(accuracyMeters: number | null | undefined): number {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return MOVE_THRESHOLD_METERS;
  return Math.min(MAX_ACCURACY_THRESHOLD_METERS, Math.max(MOVE_THRESHOLD_METERS, accuracyMeters));
}

// "move": upload the new fix. "check-in": standing still -- re-send the
// SAME spot that was last sent (only the timestamp refreshes), so jitter
// never moves a parked responder's marker. "skip": nothing to send yet.
export type UploadDecision = "move" | "check-in" | "skip";

export function uploadDecision(
  lastSent: Coordinates | null,
  lastSentAt: number,
  fix: Coordinates,
  now: number,
  accuracyMeters?: number | null,
): UploadDecision {
  if (!lastSent) return "move";
  if (distanceMeters(lastSent, fix) >= movementThresholdMeters(accuracyMeters)) return "move";
  return now - lastSentAt >= CHECK_IN_INTERVAL_MS ? "check-in" : "skip";
}

// ---- Route recalculation --------------------------------------------------

// A route is re-requested once its origin has moved at least this far AND
// at least ROUTE_MIN_INTERVAL_MS has passed since the previous request --
// never on every location update.
export const ROUTE_MIN_MOVE_METERS = 30;
export const ROUTE_MIN_INTERVAL_MS = 10_000;

export type RouteOriginRecord = {
  coords: Coordinates;
  at: number;
  key: string | undefined;
};

export type RouteOriginDecision =
  | { action: "update" }
  | { action: "wait"; retryInMs: number }
  | { action: "keep" };

// `key` identifies whose route it is (e.g. the selected responder): a new key
// always routes immediately, since it's a different origin altogether.
export function routeOriginDecision(
  last: RouteOriginRecord | null,
  coords: Coordinates,
  key: string | undefined,
  now: number,
): RouteOriginDecision {
  if (!last || last.key !== key) return { action: "update" };
  if (distanceMeters(last.coords, coords) < ROUTE_MIN_MOVE_METERS) return { action: "keep" };
  const elapsed = now - last.at;
  if (elapsed >= ROUTE_MIN_INTERVAL_MS) return { action: "update" };
  return { action: "wait", retryInMs: ROUTE_MIN_INTERVAL_MS - elapsed };
}

// ---- Marker glide ---------------------------------------------------------

export const MARKER_GLIDE_MS = 1000;
// Farther than this between two positions is a teleport (first real fix,
// a long gap), not movement -- snap instead of sliding across the map.
export const MARKER_SNAP_METERS = 2000;

export function easeInOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped < 0.5 ? 4 * clamped ** 3 : 1 - (-2 * clamped + 2) ** 3 / 2;
}

export function interpolateCoordinate(from: Coordinates, to: Coordinates, t: number): Coordinates {
  const clamped = Math.min(1, Math.max(0, t));
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * clamped,
    longitude: from.longitude + (to.longitude - from.longitude) * clamped,
  };
}
