import { apiPatch, apiPost } from "./api";
import type { Coordinates } from "./location.service";

export type SosAlert = {
  id: string;
  status: string;
  createdAt: string;
  incidentId: string | null;
};

export async function triggerSOS(
  token: string,
  location: Coordinates,
  locationLabel?: string,
): Promise<SosAlert> {
  const response = await apiPost<{ success: true; alert: SosAlert }>(
    "/api/sos",
    { ...location, ...(locationLabel ? { locationLabel } : {}) },
    token,
  );
  return response.alert;
}

// Only succeeds while the SOS's mirrored incident is still "pending" (no
// responder has joined yet) -- the backend is the source of truth for this,
// returning a 409 once someone's assigned.
export async function cancelSosIncident(token: string, incidentId: string): Promise<void> {
  await apiPatch(`/api/incidents/${incidentId}/cancel`, {}, token);
}
