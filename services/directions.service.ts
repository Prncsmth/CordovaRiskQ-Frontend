// services/directions.service.ts
// Thin wrapper around Mapbox's Directions API -- a third-party device-side
// integration (like location.service.ts), not a backend call. Uses the same
// public access token already bundled for map tiles (components/map/MapboxMap.tsx).
import type { Coordinates } from "./location.service";

const DIRECTIONS_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox";

export type TravelProfile = "driving" | "walking";

export type Route = {
  coordinates: Coordinates[];
  distanceKm: number;
  durationMin: number;
};

type DirectionsResponse = {
  routes?: {
    geometry?: { coordinates?: [number, number][] };
    distance?: number;
    duration?: number;
  }[];
};

// Never throws -- any failure (network, timeout, malformed/empty response)
// resolves to null so callers can fall back to a straight-line route rather
// than showing an error state.
export async function getRoute(
  origin: Coordinates,
  destination: Coordinates,
  profile: TravelProfile,
): Promise<Route | null> {
  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) return null;

  const url =
    `${DIRECTIONS_BASE_URL}/${profile}/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    `?geometries=geojson&access_token=${accessToken}`;

  // AbortSignal.timeout() isn't implemented in this RN/Hermes runtime
  // (unlike the backend's Node.js runtime, which supports it directly) --
  // build the same timeout behavior manually via AbortController.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let body: DirectionsResponse;
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    body = (await res.json()) as DirectionsResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  const route = body.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (
    !route ||
    !Array.isArray(coords) ||
    coords.length === 0 ||
    typeof route.distance !== "number" ||
    typeof route.duration !== "number"
  ) {
    return null;
  }

  return {
    coordinates: coords.map(([longitude, latitude]) => ({ latitude, longitude })),
    distanceKm: route.distance / 1000,
    durationMin: Math.round(route.duration / 60),
  };
}
