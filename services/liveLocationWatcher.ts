// services/liveLocationWatcher.ts
// One continuous, foreground-only, high-accuracy GPS stream
// (expo-location's watchPositionAsync) shared by everything on the
// responder side that needs the live position while responding: the upload
// loop (hooks/useLiveLocationUpload.ts) and the responder's own route maps
// (hooks/useLiveCoordinates.ts, used by OnTheWayView and NavigateScreen).
//
// Reference-counted: the first subscriber starts the single native watcher,
// the last one to unsubscribe stops it -- so however many of those screens
// are mounted at once there is never more than one watcher, and nothing
// keeps the GPS on after the responder leaves those screens. There's no
// background location: when the app is backgrounded the OS stops
// delivering fixes and the stream simply resumes on return.
//
// Replaces requesting a brand-new fix (which could take up to ~8 s) for
// every upload: subscribers get each fix as soon as the OS has it, and a
// late subscriber immediately receives the most recent one.
import type { Coordinates } from "./location.service";

export type LiveFix = Coordinates & {
  // Epoch ms when this app received the fix -- the device clock, the same
  // one Date.now() comparisons use, not the GPS chip's own timestamp.
  receivedAt: number;
};

type Listener = (fix: LiveFix) => void;

// Android: at most one fix per second; and only once the device has moved a
// couple of meters, so a phone parked on a dashboard isn't firing for pure
// jitter. The upload loop has its own 15 s check-in for the stationary case.
const WATCH_TIME_INTERVAL_MS = 1000;
const WATCH_DISTANCE_INTERVAL_METERS = 2;

const listeners = new Set<Listener>();
let subscription: { remove: () => void } | null = null;
// Bumped on every start/stop, so a watchPositionAsync that resolves after
// the last subscriber already left (or after a restart) removes itself
// instead of leaking a second watcher.
let generation = 0;
let latest: LiveFix | null = null;

function emit(fix: LiveFix) {
  latest = fix;
  for (const listener of Array.from(listeners)) {
    try {
      listener(fix);
    } catch {
      // One misbehaving subscriber mustn't stop the others getting fixes.
    }
  }
}

async function start(myGeneration: number) {
  try {
    const module = require("expo-location") as typeof import("expo-location");
    const requestFn =
      (module as any).requestForegroundPermissionsAsync ??
      (module as any).default?.requestForegroundPermissionsAsync;
    const watchFn =
      (module as any).watchPositionAsync ?? (module as any).default?.watchPositionAsync;
    const accuracyEnum = (module as any).Accuracy ?? (module as any).default?.Accuracy;
    if (typeof requestFn !== "function" || typeof watchFn !== "function") return;

    const { status } = await requestFn();
    if (status !== "granted" || myGeneration !== generation) return;

    const sub = await watchFn(
      {
        accuracy: accuracyEnum?.High,
        timeInterval: WATCH_TIME_INTERVAL_MS,
        distanceInterval: WATCH_DISTANCE_INTERVAL_METERS,
      },
      (position: { coords: { latitude: number; longitude: number } }) => {
        if (myGeneration !== generation) return;
        emit({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          receivedAt: Date.now(),
        });
      },
    );
    if (myGeneration !== generation) {
      sub?.remove?.();
      return;
    }
    subscription = sub;
  } catch {
    // Native module missing (web) or the watch failed -- subscribers fall
    // back to one-off fixes (see useLiveLocationUpload/useLiveCoordinates).
  }
}

function stop() {
  generation += 1;
  try {
    subscription?.remove();
  } catch {
    // Already gone -- nothing to release.
  }
  subscription = null;
  // A fix from a previous responding session mustn't be replayed to the
  // next one as if it were current.
  latest = null;
}

export function subscribeToLiveLocation(listener: Listener): () => void {
  listeners.add(listener);
  if (latest) listener(latest);
  if (listeners.size === 1) {
    generation += 1;
    start(generation);
  }

  let subscribed = true;
  return () => {
    if (!subscribed) return;
    subscribed = false;
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

// For tests and diagnostics: how many subscribers / whether a native
// watcher is currently held.
export function liveLocationWatcherStats(): { subscribers: number; watching: boolean } {
  return { subscribers: listeners.size, watching: subscription !== null };
}
