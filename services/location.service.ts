// services/location.service.ts
export type Coordinates = {
  latitude: number;
  longitude: number;
};

// expo-location's getCurrentPositionAsync has no built-in timeout -- its own
// docs warn it "may take several seconds" to get a GPS fix, and on a real
// device with a weak/no signal (indoors, cold GPS chip) it can hang far
// longer than that. Screens awaiting getCurrentLocation() (e.g. the
// responder Navigate screen) would otherwise be stuck forever.
const FRESH_FIX_TIMEOUT_MS = 8000;

function withTimeout(promise: Promise<any>, ms: number): Promise<any> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}

// Best-effort location fetch — the native module may not be linked (Expo Go,
// web) and permission may be denied, so callers should treat `undefined` as
// "location unavailable" and degrade gracefully rather than throw.
export async function getCurrentLocation(): Promise<Coordinates | undefined> {
  try {
    const module = require("expo-location") as typeof import("expo-location");
    const requestFn =
      (module as any).requestForegroundPermissionsAsync ??
      (module as any).default?.requestForegroundPermissionsAsync;
    const getCurrentPositionFn =
      (module as any).getCurrentPositionAsync ??
      (module as any).default?.getCurrentPositionAsync;
    const getLastKnownPositionFn =
      (module as any).getLastKnownPositionAsync ??
      (module as any).default?.getLastKnownPositionAsync;

    if (
      typeof requestFn !== "function" ||
      typeof getCurrentPositionFn !== "function"
    ) {
      return undefined;
    }

    const { status } = await requestFn();
    if (status !== "granted") return undefined;

    const position = await withTimeout(
      getCurrentPositionFn({}),
      FRESH_FIX_TIMEOUT_MS,
    );
    if (position) {
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    }

    // Fresh fix timed out -- fall back to whatever cached fix the OS has,
    // which returns immediately instead of waiting on GPS.
    if (typeof getLastKnownPositionFn === "function") {
      const cached = await getLastKnownPositionFn({}).catch(() => null);
      if (cached) {
        return {
          latitude: cached.coords.latitude,
          longitude: cached.coords.longitude,
        };
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

// Read-only check of the current OS foreground-location permission, used by
// the Settings screen's "Location Access" toggle -- neither iOS nor Android
// let an app silently revoke a permission it was granted, so that toggle
// reflects this instead of maintaining its own fake on/off state.
export async function getLocationPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined" | "unavailable"
> {
  try {
    const module = require("expo-location") as typeof import("expo-location");
    const getFn =
      (module as any).getForegroundPermissionsAsync ??
      (module as any).default?.getForegroundPermissionsAsync;
    if (typeof getFn !== "function") return "unavailable";
    const { status } = await getFn();
    return status;
  } catch {
    return "unavailable";
  }
}

// Triggers the OS permission prompt -- only actually shows a dialog the
// first time, or again on Android after a non-permanent denial; a
// permanently-denied/blocked permission resolves immediately with "denied"
// and the caller needs to send the user to system settings instead.
export async function requestLocationPermission(): Promise<
  "granted" | "denied" | "undetermined" | "unavailable"
> {
  try {
    const module = require("expo-location") as typeof import("expo-location");
    const requestFn =
      (module as any).requestForegroundPermissionsAsync ??
      (module as any).default?.requestForegroundPermissionsAsync;
    if (typeof requestFn !== "function") return "unavailable";
    const { status } = await requestFn();
    return status;
  } catch {
    return "unavailable";
  }
}

const VERIFIED_FIX_TIMEOUT_MS = 10_000;

export type VerifiedLocationResult =
  | { status: "granted"; coords: Coordinates }
  | { status: "denied" }
  | { status: "unavailable" };

// Used only where a fresh, permission-aware fix must gate a real action --
// entering pin-drop mode, submitting an incident report, or confirming SOS
// (see utils/geofence.ts). getCurrentLocation() above collapses
// permission-denied and GPS-failure into the same `undefined`, which isn't
// enough to show the right modal ("Location Permission Required" vs
// "Reporting Not Available" / "SOS Not Available"). Deliberately does one
// single high-accuracy request rather than a multi-attempt accuracy-
// threshold retry loop -- see the design spec for why.
export async function getVerifiedLocation(): Promise<VerifiedLocationResult> {
  try {
    const module = require("expo-location") as typeof import("expo-location");
    const requestFn =
      (module as any).requestForegroundPermissionsAsync ??
      (module as any).default?.requestForegroundPermissionsAsync;
    const getCurrentPositionFn =
      (module as any).getCurrentPositionAsync ??
      (module as any).default?.getCurrentPositionAsync;
    const AccuracyEnum = (module as any).Accuracy ?? (module as any).default?.Accuracy;

    if (typeof requestFn !== "function" || typeof getCurrentPositionFn !== "function") {
      return { status: "unavailable" };
    }

    const { status } = await requestFn();
    if (status !== "granted") return { status: "denied" };

    const position = await withTimeout(
      getCurrentPositionFn({ accuracy: AccuracyEnum?.Highest }),
      VERIFIED_FIX_TIMEOUT_MS,
    );
    if (!position) return { status: "unavailable" };

    return {
      status: "granted",
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
