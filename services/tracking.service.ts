// services/tracking.service.ts
// Wraps GET /api/incidents/:id/tracking -- a real, already-implemented
// backend endpoint (trackingService.getForIncident on the backend), not an
// assumed contract. It already enforces the access rules the Track
// Responder screen depends on: 403 if the caller isn't the incident's own
// reporter, 404 once the incident leaves its active window (resolved/
// cancelled), 404 until a responder has accepted.
import { apiGet, type ApiError } from "./api";
import type { Coordinates } from "./location.service";

// Mirrors the backend's ResponderRosterStatus, minus "left"/"declined" --
// getForIncident only ever returns the currently-accepted responder, whose
// status can't be either of those (see pickAcceptedByResponderId).
export type ResponderRosterStatus = "joined" | "on_the_way" | "arrived";

export type TrackingSnapshot = {
  responderId: string;
  responderName: string;
  location: Coordinates | null;
  locationUpdatedAt: string | null;
  status: ResponderRosterStatus;
  etaMinutes: number | null;
};

export type TrackingResult =
  | { state: "ok"; snapshot: TrackingSnapshot }
  // No responder has accepted yet -- non-terminal, caller should keep polling.
  | { state: "waiting" }
  // Incident is resolved/cancelled -- terminal, caller should stop polling.
  | { state: "ended" }
  // Caller isn't this incident's reporter.
  | { state: "forbidden" };

type TrackingApiRow = {
  responderId: string;
  responderName: string;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
  status: ResponderRosterStatus;
  etaMinutes: number | null;
};

export async function getResponderTracking(
  token: string,
  incidentId: string,
): Promise<TrackingResult> {
  try {
    const response = await apiGet<{ success: true; tracking: TrackingApiRow }>(
      `/api/incidents/${incidentId}/tracking`,
      token,
    );
    const row = response.tracking;
    return {
      state: "ok",
      snapshot: {
        responderId: row.responderId,
        responderName: row.responderName,
        location:
          row.latitude != null && row.longitude != null
            ? { latitude: row.latitude, longitude: row.longitude }
            : null,
        locationUpdatedAt: row.locationUpdatedAt,
        status: row.status,
        etaMinutes: row.etaMinutes,
      },
    };
  } catch (err) {
    const status = (err as Partial<ApiError>)?.status;
    const message = err instanceof Error ? err.message : "";

    if (status === 403) return { state: "forbidden" };
    // Distinguishes the backend's two 404 cases by message text -- both are
    // "not found" at the HTTP level, but only one of them (tracking window
    // closed) should stop polling; "no responder yet" should keep retrying.
    if (status === 404 && message.includes("no longer available")) {
      return { state: "ended" };
    }
    if (status === 404) return { state: "waiting" };

    // Network/server failure -- rethrow so the poller treats this tick as a
    // transient miss (keep last known state) instead of a real state change.
    throw err;
  }
}
