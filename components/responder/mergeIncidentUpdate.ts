// components/responder/mergeIncidentUpdate.ts
// Merges a live Socket.IO incident:updated payload into local Incident
// state. Deliberately never touches myStatus or distanceKm -- neither is
// present in the broadcast payload (myStatus is per-viewer; distanceKm is
// computed client-side from the responder's own location). Pure so it's
// unit-testable without mounting the screen, same pattern as
// phaseForMyStatus.
import type { Incident } from "@/responder/types/responder";
import type { IncidentRealtimeUpdate } from "@/responder/services/incidentSocket.service";

export function mergeIncidentUpdate(
  current: Incident,
  update: IncidentRealtimeUpdate,
): Incident {
  if (update.id !== current.id) return current;
  return {
    ...current,
    status: update.status,
    team: update.responders,
  };
}
