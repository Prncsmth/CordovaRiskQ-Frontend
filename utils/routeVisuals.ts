// utils/routeVisuals.ts
// Shared by every screen that renders one or more route alternatives on a
// map (responder/components/shared/LiveIncidentMap.tsx,
// app/evacuation-detail/navigate.tsx): turns a Route[] + which one is
// selected into the polylines/labels to draw. Non-selected routes render
// dimmed with a tappable duration pill; the selected route renders last
// (on top) in the caller's own active color. A single-route (or
// zero-route, falling back to a straight line) case never gets pills --
// there's nothing to choose between.
import type { MapMarker, MapPolyline } from "@/components/map/AppMap";
import type { Route } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";
import { midpointAlongPath } from "@/utils/distance";

const DIMMED_ROUTE_COLOR = "#94A3B8";
const ROUTE_MARKER_ID_PREFIX = "route-";

export function buildRouteVisuals(
  routes: Route[],
  selectedRouteIndex: number,
  activeColor: string,
  straightLineFallback: [Coordinates, Coordinates],
): { polylines: MapPolyline[]; labelMarkers: MapMarker[] } {
  if (routes.length === 0) {
    return {
      polylines: [{ points: straightLineFallback, color: activeColor, dashed: false, weight: 4 }],
      labelMarkers: [],
    };
  }

  const hasAlternatives = routes.length > 1;
  const polylines: MapPolyline[] = [];
  const labelMarkers: MapMarker[] = [];

  routes.forEach((route, index) => {
    if (index === selectedRouteIndex) return;
    polylines.push({ points: route.coordinates, color: DIMMED_ROUTE_COLOR, dashed: false, weight: 3 });
    if (hasAlternatives) {
      const point = midpointAlongPath(route.coordinates);
      labelMarkers.push({
        id: `${ROUTE_MARKER_ID_PREFIX}${index}`,
        latitude: point.latitude,
        longitude: point.longitude,
        icon: "label",
        label: `${route.durationMin} min`,
        color: DIMMED_ROUTE_COLOR,
      });
    }
  });

  const selected = routes[selectedRouteIndex];
  polylines.push({ points: selected.coordinates, color: activeColor, dashed: false, weight: 4 });
  if (hasAlternatives) {
    const point = midpointAlongPath(selected.coordinates);
    labelMarkers.push({
      id: `${ROUTE_MARKER_ID_PREFIX}${selectedRouteIndex}`,
      latitude: point.latitude,
      longitude: point.longitude,
      icon: "label",
      label: `${selected.durationMin} min`,
      color: activeColor,
    });
  }

  return { polylines, labelMarkers };
}

// Returns the route index a tapped marker id refers to, or null if the
// pressed marker wasn't a route label pill at all (e.g. the responder or
// incident marker, which share the same onMarkerPress callback).
export function routeIndexFromMarkerId(id: string): number | null {
  if (!id.startsWith(ROUTE_MARKER_ID_PREFIX)) return null;
  const index = Number(id.slice(ROUTE_MARKER_ID_PREFIX.length));
  return Number.isNaN(index) ? null : index;
}
