import { apiGet, apiPatch } from "./api";
import type { Coordinates } from "./location.service";
import { haversineDistanceKm } from "@/utils/distance";
import type { Incident, IncidentStatus } from "@/types/responder";

type IncidentApiRow = {
  id: string;
  category: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  urgency: "high" | "medium" | "low";
  status: IncidentStatus;
};

// Maps a stored category (the citizen-facing CategoryId, plus "sos" for
// SOS-sourced incidents) to the display label the responder screens already
// render via `incident.type` — keeps every existing component (IncidentCard,
// getIncidentVisual, DetailRow, etc.) unchanged.
export const CATEGORY_LABELS: Record<string, string> = {
  flood: "Flood",
  fire: "Fire",
  medical: "Medical Emergency",
  "road-accident": "Road Accident",
  other: "Other",
  sos: "SOS Alert",
};

function toIncident(row: IncidentApiRow, responderLocation?: Coordinates): Incident {
  const hasCoords = row.latitude != null && row.longitude != null;
  const incidentCoords = hasCoords
    ? { latitude: row.latitude as number, longitude: row.longitude as number }
    : undefined;

  return {
    id: row.id,
    type: CATEGORY_LABELS[row.category] ?? row.category,
    location: row.locationLabel,
    urgency: row.urgency,
    distanceKm:
      incidentCoords && responderLocation
        ? haversineDistanceKm(responderLocation, incidentCoords)
        : undefined,
    status: row.status,
    maxResponders: 1,
    team: [],
    incidentCoords,
  };
}

export async function getIncidents(
  token: string,
  responderLocation?: Coordinates,
): Promise<Incident[]> {
  const response = await apiGet<{ success: true; incidents: IncidentApiRow[] }>(
    "/api/incidents",
    token,
  );
  return response.incidents.map((row) => toIncident(row, responderLocation));
}

export async function getIncidentById(
  token: string,
  id: string,
  responderLocation?: Coordinates,
): Promise<Incident | undefined> {
  try {
    const response = await apiGet<{ success: true; incident: IncidentApiRow }>(
      `/api/incidents/${id}`,
      token,
    );
    return toIncident(response.incident, responderLocation);
  } catch {
    return undefined;
  }
}

export async function acceptIncident(token: string, id: string): Promise<Incident> {
  const response = await apiPatch<{ success: true; incident: IncidentApiRow }>(
    `/api/incidents/${id}/accept`,
    {},
    token,
  );
  return toIncident(response.incident);
}

export async function updateIncidentStatus(
  token: string,
  id: string,
  status: "on_the_way" | "arrived" | "completed" | "cancelled",
): Promise<Incident> {
  const response = await apiPatch<{ success: true; incident: IncidentApiRow }>(
    `/api/incidents/${id}/status`,
    { status },
    token,
  );
  return toIncident(response.incident);
}
