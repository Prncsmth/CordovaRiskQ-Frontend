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
import { farthestPointFrom, midpointAlongPath } from "@/utils/distance";

// Confirmed via an on-device diagnostic test (a deliberately garish magenta,
// weight-8 render) that the polyline mechanism itself was always fine --
// prior production colors tried: #94A3B8 (too light/low-contrast),
// #475569 and #1E293B (too dark), #7C3AED violet (didn't look right). A
// lighter mid-gray, still noticeably darker than the original #94A3B8, as
// the current balance between contrast and not looking too heavy. Doesn't
// collide with any other color already meaningful on this map (orange =
// selected route, red = incident, green = arrive/success, blue = water);
// dashing adds distinction on top of that.
const DIMMED_ROUTE_COLOR = "#64748B";
// Weight 8 was the diagnostic value proven visible against a walking
// detour that overlapped the primary route for most of its length (since
// removed -- directions.service.ts no longer synthesizes a second walking
// route). Driving's alternates come straight from Mapbox and diverge onto
// genuinely different streets much earlier, so they don't need to fight
// that same near-total overlap; kept slightly above the original default
// (3) rather than all the way back down, as a safety margin against the
// same low-contrast problem recurring.
const ALTERNATE_ROUTE_WEIGHT = 6;
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

  // selectedRouteIndex can transiently point past the end of a freshly
  // fetched, shorter route list -- the hooks that own this state reset it
  // back to 0 in an effect once a new route set lands, but that reset runs
  // one render *after* the route list itself already updated (e.g.
  // switching from driving, with 2 routes, to walking, with only 1, while
  // route 1 was selected). Clamp here so this render never indexes past
  // the end in that gap, instead of crashing on routes[selectedRouteIndex].
  const safeIndex = selectedRouteIndex >= 0 && selectedRouteIndex < routes.length ? selectedRouteIndex : 0;

  const hasAlternatives = routes.length > 1;
  const polylines: MapPolyline[] = [];
  const labelMarkers: MapMarker[] = [];
  const selectedForLabels = routes[safeIndex];

  routes.forEach((route, index) => {
    if (index === safeIndex) return;
    polylines.push({ points: route.coordinates, color: DIMMED_ROUTE_COLOR, dashed: true, weight: ALTERNATE_ROUTE_WEIGHT });
    if (hasAlternatives) {
      // Placed where this route is farthest from the selected one, not at
      // its own midpoint-by-distance -- a detour that splits off late and
      // rejoins early otherwise gets its label stuck in the long stretch
      // both routes share, right on top of (or indistinguishable from) the
      // selected route's own label/line.
      const point = farthestPointFrom(route.coordinates, selectedForLabels.coordinates);
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

  const selected = routes[safeIndex];
  polylines.push({ points: selected.coordinates, color: activeColor, dashed: false, weight: 4 });
  if (hasAlternatives) {
    const point = midpointAlongPath(selected.coordinates);
    labelMarkers.push({
      id: `${ROUTE_MARKER_ID_PREFIX}${safeIndex}`,
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
