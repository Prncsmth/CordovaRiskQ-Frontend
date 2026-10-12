// utils/trackResponders.ts
// Singular/plural wording for tracking an incident's responders, shared by
// the SOS screen, Report Details and the Track Responder(s) map so they
// always agree: one responder -> "Track Responder", two or more -> "Track
// Responders".
//
// Also the pure state logic behind the live map (hooks/useResponderTracking):
// merging a polled snapshot and individual socket location pushes by
// responder ID, and each responder's driving/walking state.
import type { Coordinates } from "@/services/location.service";
import type { ResponderTrack, TrackingSnapshot } from "@/services/tracking.service";
import { haversineDistanceKm } from "@/utils/distance";
import {
  advanceMovement,
  INITIAL_MOVEMENT_STATE,
  type MovementMode,
  type MovementState,
} from "@/utils/responderMovement";

// One live position push (the backend's incident:responderLocation payload).
export type ResponderLocationUpdate = {
  responderId: string;
  latitude: number;
  longitude: number;
  locationUpdatedAt: string;
};

function updatedAtMs(value: string | null): number {
  if (!value) return -Infinity;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : -Infinity;
}

function sameTrack(a: ResponderTrack, b: ResponderTrack): boolean {
  return (
    a.responderId === b.responderId &&
    a.responderName === b.responderName &&
    a.status === b.status &&
    a.etaMinutes === b.etaMinutes &&
    a.locationUpdatedAt === b.locationUpdatedAt &&
    a.location?.latitude === b.location?.latitude &&
    a.location?.longitude === b.location?.longitude
  );
}

// The snapshot's flat fields mirror its primary (first-accepted) responder.
// The snapshot's other fields (the primary's contact) are carried over --
// rebuilding from the responder alone used to drop them on every live push.
function withPrimary(snapshot: TrackingSnapshot, responders: ResponderTrack[]): TrackingSnapshot {
  const primary = responders.find((r) => r.responderId === snapshot.responderId) ?? responders[0];
  return primary ? { ...snapshot, ...primary, responders } : { ...snapshot, responders };
}

// Applies one socket location push to the matching responder only. Returns
// the same snapshot object when nothing changes -- an unknown responder (the
// next poll brings them in with their name/status) or a push no newer than
// what's already shown -- so React skips the re-render. Every other
// responder keeps its object identity, so its marker isn't touched.
export function mergeResponderLocation(
  snapshot: TrackingSnapshot,
  update: ResponderLocationUpdate,
): TrackingSnapshot {
  const index = snapshot.responders.findIndex((r) => r.responderId === update.responderId);
  if (index === -1) return snapshot;
  const current = snapshot.responders[index];
  if (updatedAtMs(update.locationUpdatedAt) <= updatedAtMs(current.locationUpdatedAt)) return snapshot;

  const responders = snapshot.responders.slice();
  responders[index] = {
    ...current,
    location: { latitude: update.latitude, longitude: update.longitude },
    locationUpdatedAt: update.locationUpdatedAt,
  };
  return withPrimary(snapshot, responders);
}

// Reconciles a freshly polled snapshot with what's on screen. The roster
// (who's helping, names, statuses, ETAs) comes from the poll, but a
// responder's location is kept from `prev` when it's newer -- a socket push
// can land after the poll request was sent, and the poll mustn't drag the
// marker back. Unchanged responders keep their previous object.
export function mergeTrackingSnapshot(
  prev: TrackingSnapshot | null,
  next: TrackingSnapshot,
): TrackingSnapshot {
  if (!prev) return next;
  const responders = next.responders.map((incoming) => {
    const existing = prev.responders.find((r) => r.responderId === incoming.responderId);
    if (!existing) return incoming;
    const merged =
      updatedAtMs(existing.locationUpdatedAt) > updatedAtMs(incoming.locationUpdatedAt)
        ? { ...incoming, location: existing.location, locationUpdatedAt: existing.locationUpdatedAt }
        : incoming;
    return sameTrack(existing, merged) ? existing : merged;
  });
  // Nothing changed since the last poll -- keep the same object so a quiet
  // poll tick doesn't re-render the map.
  const unchanged =
    next.responderId === prev.responderId &&
    next.primaryMobile === prev.primaryMobile &&
    next.primaryUnit === prev.primaryUnit &&
    responders.length === prev.responders.length &&
    responders.every((r, i) => r === prev.responders[i]);
  if (unchanged) return prev;
  return withPrimary(next, responders);
}

// A parked responder's phone still reports a slightly different spot on
// every check-in (GPS jitter, often 5-15 m), which made their marker creep
// around while they weren't moving. The map shows a held position instead,
// and only moves it once the responder is this far from it -- small steps
// add up against the held spot, so real movement always gets through.
export const JITTER_HOLD_METERS = 15;

// The position to draw for each responder (per responder ID). Display only:
// the snapshot, freshness and driving/walking detection still use every
// raw position. Returns the same object when no marker needs to move.
export function steadyPositions(
  prev: Record<string, Coordinates>,
  responders: ResponderTrack[],
): Record<string, Coordinates> {
  const next: Record<string, Coordinates> = {};
  let changed = false;
  for (const r of responders) {
    if (!r.location) continue;
    const held = prev[r.responderId];
    const keep = held && haversineDistanceKm(held, r.location) * 1000 < JITTER_HOLD_METERS;
    next[r.responderId] = keep ? held : r.location;
    if (next[r.responderId] !== held) changed = true;
  }
  if (Object.keys(next).length !== Object.keys(prev).length) changed = true;
  return changed ? next : prev;
}

export type TrackingData = {
  snapshot: TrackingSnapshot | null;
  // Per responder ID -- each responder has their own driving/walking state.
  movement: Record<string, MovementState>;
  // Per responder ID -- where to draw them (see steadyPositions).
  positions: Record<string, Coordinates>;
};

export const INITIAL_TRACKING_DATA: TrackingData = { snapshot: null, movement: {}, positions: {} };

export type TrackingAction =
  | { type: "snapshot"; snapshot: TrackingSnapshot }
  | { type: "location"; update: ResponderLocationUpdate };

function advanceAll(
  movement: Record<string, MovementState>,
  responders: ResponderTrack[],
): Record<string, MovementState> {
  const next: Record<string, MovementState> = {};
  let changed = Object.keys(movement).length !== responders.length;
  for (const r of responders) {
    const prevState = movement[r.responderId] ?? INITIAL_MOVEMENT_STATE;
    const state = r.location
      ? advanceMovement(prevState, {
          latitude: r.location.latitude,
          longitude: r.location.longitude,
          at: updatedAtMs(r.locationUpdatedAt),
        })
      : prevState;
    if (state !== movement[r.responderId]) changed = true;
    next[r.responderId] = state;
  }
  return changed ? next : movement;
}

export function trackingReducer(data: TrackingData, action: TrackingAction): TrackingData {
  const snapshot =
    action.type === "snapshot"
      ? mergeTrackingSnapshot(data.snapshot, action.snapshot)
      : data.snapshot
        ? mergeResponderLocation(data.snapshot, action.update)
        : null;
  if (snapshot === data.snapshot) return data;
  return {
    snapshot,
    movement: snapshot ? advanceAll(data.movement, snapshot.responders) : data.movement,
    positions: snapshot ? steadyPositions(data.positions, snapshot.responders) : data.positions,
  };
}

// The arrival line on the Call Responder card, e.g. "Arriving in ~6 min".
export function arrivalLabel(
  status: string,
  hasLocation: boolean,
  etaMinutes: number | null | undefined,
): string {
  if (status === "arrived") return "Arrived";
  if (!hasLocation) return "Waiting for location";
  if (etaMinutes == null || !Number.isFinite(etaMinutes)) return "On the way";
  return `Arriving in ~${Math.max(1, Math.round(etaMinutes))} min`;
}

// The icon each responder should show right now.
export function movementModes(movement: Record<string, MovementState>): Record<string, MovementMode> {
  const modes: Record<string, MovementMode> = {};
  for (const [id, state] of Object.entries(movement)) modes[id] = state.mode;
  return modes;
}

export function trackRespondersLabel(count: number): string {
  return count >= 2 ? "Track Responders" : "Track Responder";
}

export function respondersAssignedTitle(count: number): string {
  return count >= 2 ? "Responders Assigned" : "Responder Assigned";
}

// Header of the Track Responders map when tracking two or more -- how many
// are coming, e.g. "3 responders on the way", "3 responders · 1 arrived",
// "3 responders arrived".
export function respondersHeadline(statuses: string[]): string {
  const total = statuses.length;
  const arrived = statuses.filter((status) => status === "arrived").length;
  if (arrived === 0) return `${total} responders on the way`;
  if (arrived === total) return `${total} responders arrived`;
  return `${total} responders · ${arrived} arrived`;
}

// The responder the map focuses on (route, ETA, freshness): the one the
// user tapped, or the first to accept when they haven't picked one -- or
// when the picked one has since left the incident.
export function selectedResponder<T extends { responderId: string }>(
  responders: T[],
  selectedId: string | null,
): T | undefined {
  return responders.find((r) => r.responderId === selectedId) ?? responders[0];
}

// e.g. "Juan has been assigned and is on the way."
//      "Juan and Pedro are on the way."
//      "Juan and 2 other responders are on the way."
export function respondersAssignedMessage(names: string[]): string {
  const [first, second] = names.map((name) => name.trim() || "A responder");
  if (names.length <= 1) return `${first ?? "A responder"} has been assigned and is on the way.`;
  if (names.length === 2) return `${first} and ${second} are on the way.`;
  const others = names.length - 1;
  return `${first} and ${others} other responders are on the way.`;
}
