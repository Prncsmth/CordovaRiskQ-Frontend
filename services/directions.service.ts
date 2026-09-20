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

type RawRoute = {
  geometry?: { coordinates?: [number, number][] };
  distance?: number;
  duration?: number;
};

type DirectionsResponse = {
  routes?: RawRoute[];
};

// Shared by getRoute/getRoutes below. Never throws -- any failure (network,
// timeout, malformed/empty response) resolves to null so callers can fall
// back to a straight-line route rather than showing an error state.
// alternatives=true is always requested -- Mapbox still returns the same
// primary route first either way (routes[0] is unaffected), it just may
// also include up to 2 additional route objects after it. Walking rarely
// has more than one (confirmed empirically -- the same pair that returns 2
// driving routes returns only 1 walking route); getRoutes() below doesn't
// try to force a second one, it just returns whatever Mapbox itself found.
async function fetchDirections(
  origin: Coordinates,
  destination: Coordinates,
  profile: TravelProfile,
): Promise<DirectionsResponse | null> {
  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) return null;

  const url =
    `${DIRECTIONS_BASE_URL}/${profile}/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    `?geometries=geojson&alternatives=true&access_token=${accessToken}`;

  // AbortSignal.timeout() isn't implemented in this RN/Hermes runtime
  // (unlike the backend's Node.js runtime, which supports it directly) --
  // build the same timeout behavior manually via AbortController.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as DirectionsResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function toRoute(raw: RawRoute | undefined): Route | null {
  const coords = raw?.geometry?.coordinates;
  if (
    !raw ||
    !Array.isArray(coords) ||
    coords.length === 0 ||
    typeof raw.distance !== "number" ||
    typeof raw.duration !== "number"
  ) {
    return null;
  }

  return {
    coordinates: coords.map(([longitude, latitude]) => ({ latitude, longitude })),
    distanceKm: raw.distance / 1000,
    durationMin: Math.round(raw.duration / 60),
  };
}

export async function getRoute(
  origin: Coordinates,
  destination: Coordinates,
  profile: TravelProfile,
): Promise<Route | null> {
  const body = await fetchDirections(origin, destination, profile);
  return toRoute(body?.routes?.[0]);
}

// All valid route alternatives Mapbox returned, primary route first (same
// order Mapbox itself returns -- routes[0] is always the recommended one).
// Empty array on any failure, same "caller falls back to a straight line"
// contract as getRoute.
export async function getRoutes(
  origin: Coordinates,
  destination: Coordinates,
  profile: TravelProfile,
): Promise<Route[]> {
  const body = await fetchDirections(origin, destination, profile);
  if (!body?.routes) return [];
  return body.routes.map(toRoute).filter((route): route is Route => route !== null);
}
