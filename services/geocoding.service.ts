// services/geocoding.service.ts
// Thin wrapper around Mapbox's Geocoding API -- a third-party device-side
// integration (like directions.service.ts), not a backend call. Uses the
// same public access token already bundled for map tiles and directions.
import type { Coordinates } from "./location.service";

const GEOCODING_BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

type GeocodingResponse = {
  features?: { place_name?: string }[];
};

// Never throws -- any failure (missing token, network, timeout, malformed/
// empty response) resolves to null so callers can fall back to the coarser
// barangay-lookup address rather than showing an error or a blank field.
export async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) return null;

  const url =
    `${GEOCODING_BASE_URL}/${coords.longitude},${coords.latitude}.json` +
    `?access_token=${accessToken}`;

  // AbortSignal.timeout() isn't implemented in this RN/Hermes runtime
  // (unlike the backend's Node.js runtime, which supports it directly) --
  // build the same timeout behavior manually via AbortController.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let body: GeocodingResponse;
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    body = (await res.json()) as GeocodingResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  return body.features?.[0]?.place_name ?? null;
}
