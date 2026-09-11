// components/responder/filterIncidents.ts
// Narrows the responder Dashboard's incident list by free-text search and
// urgency/type/barangay chip filters, ahead of groupIncidentsByBarangay.
import { getNearestBarangay } from "@/constants/cordovaBarangays";
import {
  UNKNOWN_LOCATION_ID,
  UNKNOWN_LOCATION_NAME,
} from "@/responder/components/dashboard/groupIncidentsByBarangay";
import type { Incident, Urgency } from "@/responder/types/responder";

export type IncidentFilters = {
  search: string;
  urgencies: Set<Urgency>;
  types: Set<string>;
  barangayIds: Set<string>;
};

export function incidentBarangay(incident: Incident): { id: string; name: string } {
  return incident.incidentCoords
    ? getNearestBarangay(
        incident.incidentCoords.latitude,
        incident.incidentCoords.longitude,
      )
    : { id: UNKNOWN_LOCATION_ID, name: UNKNOWN_LOCATION_NAME };
}

export function filterIncidents(
  incidents: Incident[],
  filters: IncidentFilters,
): Incident[] {
  const search = filters.search.trim().toLowerCase();

  return incidents.filter((incident) => {
    if (filters.urgencies.size > 0 && !filters.urgencies.has(incident.urgency)) {
      return false;
    }
    if (filters.types.size > 0 && !filters.types.has(incident.type)) {
      return false;
    }

    const barangay = incidentBarangay(incident);
    if (filters.barangayIds.size > 0 && !filters.barangayIds.has(barangay.id)) {
      return false;
    }

    if (search.length > 0) {
      const haystack = `${incident.type} ${incident.location} ${barangay.name}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}
