// utils/responderMovement.ts
// Works out whether a responder is driving or walking from their own
// consecutive positions on the citizen's Track Responders map -- the backend
// sends no speed, so this is plain distance / time between two location
// updates. Kept pure (no React, no clock) so the thresholds and the
// anti-flicker rules are unit-tested; useResponderTracking's reducer holds
// one MovementState per responder and advances it on every new position.
//
// GPS is noisy, so a single reading never flips the icon:
// - above VEHICLE_MIN_KMH counts as a "vehicle" vote, below WALKING_MAX_KMH
//   as a "walking" vote; it takes VOTES_TO_SWITCH consecutive votes to
//   switch, so one jumpy fix (or one slow stretch of traffic) is ignored;
// - the 6-10 km/h band in between is ambiguous (slow traffic, a brisk jog),
//   so it keeps the current icon and resets both vote counts;
// - a hop shorter than STOPPED_MAX_METERS is "stopped" -- the responder app
//   only uploads for 10 m+ moves, plus a 15 s check-in that resends roughly
//   the same spot, so anything under that is jitter, not walking. Stopped
//   keeps the last icon and leaves the vote counts alone;
// - an implausibly fast hop (a GPS jump) is ignored the same way.
import { haversineDistanceKm } from "@/utils/distance";

export type MovementMode = "vehicle" | "walking";

export const VEHICLE_MIN_KMH = 10;
export const WALKING_MAX_KMH = 6;
export const STOPPED_MAX_METERS = 10;
export const MAX_PLAUSIBLE_KMH = 200;
export const VOTES_TO_SWITCH = 2;

// Responders normally travel by vehicle, so that's the icon until there's
// enough movement data to say otherwise.
export const DEFAULT_MOVEMENT_MODE: MovementMode = "vehicle";

export type MovementSample = {
  latitude: number;
  longitude: number;
  // Epoch ms of the position (the server's locationUpdatedAt).
  at: number;
};

export type MovementState = {
  mode: MovementMode;
  last: MovementSample | null;
  vehicleVotes: number;
  walkingVotes: number;
};

export const INITIAL_MOVEMENT_STATE: MovementState = {
  mode: DEFAULT_MOVEMENT_MODE,
  last: null,
  vehicleVotes: 0,
  walkingVotes: 0,
};

// km/h between two samples, or null when there's no usable time gap.
export function speedKmh(from: MovementSample, to: MovementSample): number | null {
  const seconds = (to.at - from.at) / 1000;
  if (!(seconds > 0)) return null;
  const km = haversineDistanceKm(from, to);
  return km / (seconds / 3600);
}

export type SpeedClass = "vehicle" | "walking" | "ambiguous" | "stopped" | "ignored";

export function classifyHop(from: MovementSample, to: MovementSample): SpeedClass {
  const speed = speedKmh(from, to);
  if (speed === null) return "ignored";
  if (haversineDistanceKm(from, to) * 1000 < STOPPED_MAX_METERS) return "stopped";
  if (speed > MAX_PLAUSIBLE_KMH) return "ignored";
  if (speed > VEHICLE_MIN_KMH) return "vehicle";
  if (speed < WALKING_MAX_KMH) return "walking";
  return "ambiguous";
}

// Feeds one new position in. A sample that isn't newer than the last one
// (the same position arriving from both the socket and a poll, or an
// out-of-order poll) returns the state unchanged -- same object -- so
// replaying a position is a no-op.
export function advanceMovement(state: MovementState, sample: MovementSample): MovementState {
  if (!Number.isFinite(sample.at)) return state;
  const last = state.last;
  if (!last) return { ...state, last: sample };
  if (sample.at <= last.at) return state;

  switch (classifyHop(last, sample)) {
    case "vehicle": {
      const vehicleVotes = state.vehicleVotes + 1;
      return {
        mode: vehicleVotes >= VOTES_TO_SWITCH ? "vehicle" : state.mode,
        last: sample,
        vehicleVotes,
        walkingVotes: 0,
      };
    }
    case "walking": {
      const walkingVotes = state.walkingVotes + 1;
      return {
        mode: walkingVotes >= VOTES_TO_SWITCH ? "walking" : state.mode,
        last: sample,
        vehicleVotes: 0,
        walkingVotes,
      };
    }
    case "ambiguous":
      return { mode: state.mode, last: sample, vehicleVotes: 0, walkingVotes: 0 };
    case "stopped":
    case "ignored":
      return { ...state, last: sample };
  }
}
