// services/geocoding.service.ts
// Thin wrapper around Mapbox's Geocoding API -- a third-party device-side
// integration (like directions.service.ts), not a backend call. Uses the
// same public access token already bundled for map tiles and directions.
import type { Coordinates } from "./location.service";

const GEOCODING_BASE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

type GeocodingResponse = {
  features?: {
    place_name?: string;
    text?: string;
    place_type?: string[];
    context?: { id?: string; text?: string }[];
  }[];
};

export type ReverseGeocodedLocality = {
  barangay?: string;
  municipality?: string;
  province?: string;
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

// Resolve the administrative area around a live GPS fix for the home
// greeting. Mapbox v5 can return neighborhood/locality/place features in one
// reverse lookup. In the Philippines a barangay is mapped as a neighborhood
// or a locality (inside Cordova it is a locality), the city or municipality
// is the place, and the province is the region.
export async function reverseGeocodeLocality(
  coords: Coordinates,
): Promise<ReverseGeocodedLocality | null> {
  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) return null;

  const url =
    `${GEOCODING_BASE_URL}/${coords.longitude},${coords.latitude}.json` +
    `?types=neighborhood,locality,place,region&language=en&access_token=${accessToken}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let features: NonNullable<GeocodingResponse["features"]>;
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = (await res.json()) as GeocodingResponse;
    features = body.features ?? [];
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  const byType = (type: string) => features.find((feature) => feature.place_type?.includes(type));
  const namedContext = (type: string) =>
    features
      .flatMap((feature) => feature.context ?? [])
      .find((item) => item.id?.startsWith(`${type}.`) && item.text)?.text;

  const barangay =
    byType("neighborhood")?.text ??
    namedContext("neighborhood") ??
    byType("locality")?.text ??
    namedContext("locality");
  // A highly urbanized city (Lapu-Lapu, Mandaue, Cebu City) is its own
  // province-level unit, so Mapbox tags it both "region" and "place", and
  // often without the word "City" ("Lapu-Lapu"). Name it as a city and don't
  // repeat it as the province.
  const placeFeature = byType("place");
  const isCity = placeFeature?.place_type?.includes("region") ?? false;
  const placeName = placeFeature?.text ?? namedContext("place");
  const municipality = placeName && isCity && !/\bcity$/i.test(placeName) ? `${placeName} City` : placeName;
  const province = isCity ? undefined : byType("region")?.text ?? namedContext("region");

  if (!barangay && !municipality && !province) return null;
  return {
    barangay: barangay?.replace(/^barangay\s+/i, "").trim() || undefined,
    municipality,
    province,
  };
}

// The home greeting's location line: "Barangay Day-as, Cordova". The
// province is only shown when the barangay or municipality is missing.
export function formatHomeLocationLabel(locality: ReverseGeocodedLocality | null): string | null {
  if (!locality) return null;
  const barangay = locality.barangay ? `Barangay ${locality.barangay}` : undefined;
  const parts = barangay && locality.municipality
    ? [barangay, locality.municipality]
    : [barangay ?? locality.municipality, locality.province];
  const label = parts.filter((part): part is string => Boolean(part)).join(", ");
  return label || null;
}
