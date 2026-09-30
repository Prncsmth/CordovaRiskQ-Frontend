// components/responder/selectNearestIncidents.ts
// Picks the incidents to show in the responder Dashboard's "Nearest to
// You" header -- the `count` closest incidents with a known distance,
// nearest first. Pure so it's unit-testable without mounting the screen.
// `count` defaults to unlimited -- DashboardScreen also uses this to get
// every incident sorted by distance (for its "See All" expanded view),
// where passing the full array's own length as `count` used to look like a
// real cap but could never actually truncate anything.
import type { Incident } from "@/responder/types/responder";

export function selectNearestIncidents(
  incidents: Incident[],
  count: number = Infinity,
): Incident[] {
  return incidents
    .filter((incident): incident is Incident & { distanceKm: number } =>
      incident.distanceKm != null,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}
