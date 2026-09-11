// components/responder/selectNearestIncidents.ts
// Picks the incidents to show in the responder Dashboard's "Nearest to
// You" header -- the `count` closest incidents with a known distance,
// nearest first. Pure so it's unit-testable without mounting the screen.
import type { Incident } from "@/types/responder";

export function selectNearestIncidents(
  incidents: Incident[],
  count: number,
): Incident[] {
  return incidents
    .filter((incident): incident is Incident & { distanceKm: number } =>
      incident.distanceKm != null,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}
