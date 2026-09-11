// hooks/useIncidentRoute.ts
// Derives the route/midpoint/ETA data shared by the responder's two live
// tracking views (OnTheWayView, app/responder/navigate.tsx) from a
// responder<->incident coordinate pair. Callers own fetching
// responderCoords themselves (their loading/retry needs differ), this hook
// only covers the derived-data logic that's identical either way.
import { useRoute } from "@/hooks/useRoute";
import type { Route } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";

export function useIncidentRoute(
  responderCoords: Coordinates | undefined,
  incidentCoords: Coordinates | undefined,
  fallbackEtaMinutes: number | undefined,
  fallbackDistanceKm: number | undefined,
): {
  route: Route | null;
  midpoint: Coordinates | undefined;
  durationMin: number;
  distanceKm: number | undefined;
} {
  const route = useRoute(responderCoords, incidentCoords, "driving");

  const midpoint =
    responderCoords && incidentCoords
      ? {
          latitude: (responderCoords.latitude + incidentCoords.latitude) / 2,
          longitude: (responderCoords.longitude + incidentCoords.longitude) / 2,
        }
      : undefined;

  const durationMin = route?.durationMin ?? fallbackEtaMinutes ?? 6;
  const distanceKm = route?.distanceKm ?? fallbackDistanceKm;

  return { route, midpoint, durationMin, distanceKm };
}
