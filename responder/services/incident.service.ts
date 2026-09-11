import { apiGet, apiPatch, apiPost, type ApiError } from "@/services/api";
import type { Coordinates } from "@/services/location.service";
import { haversineDistanceKm } from "@/utils/distance";
import { formatDate } from "@/utils/formatter";
import type { Incident, IncidentStatus, MyResponderStatus, ResponderStatus } from "@/responder/types/responder";

type IncidentApiRow = {
  id: string;
  category: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  urgency: "high" | "medium" | "low";
  status: IncidentStatus;
  responders?: { id: string; name: string; status: ResponderStatus }[];
  myStatus?: MyResponderStatus;
  createdAt: string;
  updatedAt: string;
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

export function toIncident(row: IncidentApiRow, responderLocation?: Coordinates): Incident {
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
    team: row.responders ?? [],
    myStatus: row.myStatus ?? "pending",
    incidentCoords,
    createdAt: row.createdAt,
  };
}

export type CompletedIncident = {
  id: string;
  type: string;
  location: string;
  completedDate: string;
  ref: string;
};

export function toCompletedIncident(row: IncidentApiRow): CompletedIncident {
  return {
    id: row.id,
    type: CATEGORY_LABELS[row.category] ?? row.category,
    location: row.locationLabel,
    completedDate: formatDate(row.updatedAt),
    ref: row.id.slice(0, 8).toUpperCase(),
  };
}

export async function getCompletedIncidents(token: string): Promise<CompletedIncident[]> {
  const response = await apiGet<{ success: true; incidents: IncidentApiRow[] }>(
    "/api/incidents/completed",
    token,
  );
  return response.incidents.map(toCompletedIncident);
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
  } catch (err) {
    // Only a real 404 means "no such incident" -- a network/server failure
    // should propagate so callers can distinguish and offer a retry instead
    // of silently looking like the incident doesn't exist.
    if ((err as Partial<ApiError>)?.status === 404) {
      return undefined;
    }
    throw err;
  }
}

async function updateMyResponderRow(
  token: string,
  id: string,
  status: MyResponderStatus,
): Promise<Incident> {
  const response = await apiPatch<{ success: true; incident: IncidentApiRow }>(
    `/api/incidents/${id}/responders/me`,
    { status },
    token,
  );
  return toIncident(response.incident);
}

export function joinIncident(token: string, id: string): Promise<Incident> {
  return updateMyResponderRow(token, id, "joined");
}

export async function declineIncident(token: string, id: string): Promise<void> {
  await updateMyResponderRow(token, id, "declined");
}

export function updateMyResponderStatus(
  token: string,
  id: string,
  status: "on_the_way" | "arrived" | "left",
): Promise<Incident> {
  return updateMyResponderRow(token, id, status);
}

export async function ringTeam(token: string, id: string): Promise<void> {
  await apiPost<{ success: true }>(`/api/incidents/${id}/ring`, {}, token);
}

export async function updateIncidentStatus(
  token: string,
  id: string,
  status: "completed" | "cancelled",
): Promise<Incident> {
  const response = await apiPatch<{ success: true; incident: IncidentApiRow }>(
    `/api/incidents/${id}/status`,
    { status },
    token,
  );
  return toIncident(response.incident);
}
