// components/responder/groupIncidentsByBarangay.ts
// Groups the responder Dashboard's incidents by Barangay (derived from
// each incident's coordinates) and orders both the groups and the
// incidents within them so the most urgent, most active locations surface
// first. See docs/superpowers/specs/2026-09-07-responder-barangay-grouping-design.md.
import { getNearestBarangay } from "@/constants/cordovaBarangays";
import type { Incident } from "@/types/responder";

export const UNKNOWN_LOCATION_ID = "unknown";
export const UNKNOWN_LOCATION_NAME = "Unknown Location";

export type BarangayGroup = {
  id: string;
  name: string;
  incidents: Incident[];
  hasHighUrgency: boolean;
  mostRecentFirstSeenAt: number;
};

const URGENCY_RANK: Record<Incident["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortIncidents(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => {
    const rankDiff = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (rankDiff !== 0) return rankDiff;
    if (a.distanceKm == null) return b.distanceKm == null ? 0 : 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}

export function groupIncidentsByBarangay(
  incidents: Incident[],
  firstSeenAt: Record<string, number>,
): BarangayGroup[] {
  const groups = new Map<string, BarangayGroup>();

  for (const incident of incidents) {
    const { id, name } = incident.incidentCoords
      ? getNearestBarangay(
          incident.incidentCoords.latitude,
          incident.incidentCoords.longitude,
        )
      : { id: UNKNOWN_LOCATION_ID, name: UNKNOWN_LOCATION_NAME };

    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        name,
        incidents: [],
        hasHighUrgency: false,
        mostRecentFirstSeenAt: 0,
      };
      groups.set(id, group);
    }

    group.incidents.push(incident);
    if (incident.urgency === "high") group.hasHighUrgency = true;
    const seenAt = firstSeenAt[incident.id] ?? 0;
    if (seenAt > group.mostRecentFirstSeenAt) group.mostRecentFirstSeenAt = seenAt;
  }

  for (const group of groups.values()) {
    group.incidents = sortIncidents(group.incidents);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.id === UNKNOWN_LOCATION_ID) return b.id === UNKNOWN_LOCATION_ID ? 0 : 1;
    if (b.id === UNKNOWN_LOCATION_ID) return -1;

    if (a.hasHighUrgency !== b.hasHighUrgency) return a.hasHighUrgency ? -1 : 1;
    if (a.incidents.length !== b.incidents.length) {
      return b.incidents.length - a.incidents.length;
    }
    if (a.mostRecentFirstSeenAt !== b.mostRecentFirstSeenAt) {
      return b.mostRecentFirstSeenAt - a.mostRecentFirstSeenAt;
    }
    return a.name.localeCompare(b.name);
  });
}
