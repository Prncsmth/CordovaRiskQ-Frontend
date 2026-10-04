// components/responder/incident-detail/resolveIncident.ts
// Marks an incident completed for IncidentDetailScreen's slide-to-resolve and
// tells it whether to show the "Resolved!" success dialog. Only a successful
// backend update counts as resolved -- a failure (network, timeout, server)
// comes back as "failed" so the screen keeps the incident as it is and shows
// its "Couldn't resolve incident" dialog with a Try Again action. Pure
// (service injected) so it's unit-testable without mounting the screen.
import type { Incident } from "@/responder/types/responder";

export type ResolveIncidentDeps = {
  updateIncidentStatus: (
    token: string,
    id: string,
    status: "completed",
  ) => Promise<Incident>;
};

export type ResolveIncidentResult = { status: "resolved" } | { status: "failed" };

export async function resolveIncident(
  token: string,
  incidentId: string,
  deps: ResolveIncidentDeps,
): Promise<ResolveIncidentResult> {
  try {
    await deps.updateIncidentStatus(token, incidentId, "completed");
    return { status: "resolved" };
  } catch {
    // The dialog's copy is fixed ("not updated, try again") rather than the
    // raw error text, which for a network failure is just "Network request
    // failed".
    return { status: "failed" };
  }
}
