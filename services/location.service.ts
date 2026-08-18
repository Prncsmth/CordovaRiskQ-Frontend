// services/location.service.ts
export type Coordinates = {
  latitude: number;
  longitude: number;
};

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

    if (
      typeof requestFn !== "function" ||
      typeof getCurrentPositionFn !== "function"
    ) {
      return undefined;
    }

    const { status } = await requestFn();
    if (status !== "granted") return undefined;

    const position = await getCurrentPositionFn({});
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return undefined;
  }
}
