// responder/components/dashboard/responderAssignment.ts
// The admin assigns each responder a unit (BDRRMO / MDRRMO) and a home
// barangay. A BDRRMO responder's Dashboard shows only their own barangay;
// MDRRMO covers the whole municipality, so theirs shows everything. It's a
// focus view, not access control: the Live Map always shows all of
// Cordova, SOS alerts still reach every on-duty responder, and MDRRMO see
// whatever lands in the wrong barangay or has no location at all.
import { CORDOVA_BARANGAYS } from "@/constants/cordovaBarangays";
import { incidentBarangay } from "@/responder/components/dashboard/filterIncidents";
import type { Incident } from "@/responder/types/responder";

export type ResponderAssignment = {
  unit: string | null;
  assignedBarangay: string | null;
};

export type AssignedBarangay = { id: string; name: string };

export function assignedBarangayFor(
  assignment: ResponderAssignment | null,
): AssignedBarangay | null {
  if (!assignment?.assignedBarangay || assignment.unit === "MDRRMO") return null;
  const wanted = assignment.assignedBarangay.trim().toLowerCase();
  const match = CORDOVA_BARANGAYS.find((b) => b.name.toLowerCase() === wanted);
  return match ? { id: match.id, name: match.name } : null;
}

// The line under "Responder" in the Dashboard header; null until loaded.
export function assignmentLabel(assignment: ResponderAssignment | null): string | null {
  if (!assignment) return null;
  const barangay = assignedBarangayFor(assignment);
  if (barangay) {
    return assignment.unit
      ? `Assigned to ${barangay.name} · ${assignment.unit}`
      : `Assigned to ${barangay.name}`;
  }
  if (assignment.unit === "MDRRMO") return "All of Cordova · MDRRMO";
  return "No barangay assigned yet";
}

// What a barangay filter is hiding, so it's never silent: every incident
// placed in another barangay -- or with no location at all -- counts here.
export function incidentsOutsideBarangay(
  incidents: Incident[],
  barangayId: string | null,
): { count: number; sosCount: number } {
  if (!barangayId) return { count: 0, sosCount: 0 };
  const outside = incidents.filter((incident) => incidentBarangay(incident).id !== barangayId);
  return {
    count: outside.length,
    sosCount: outside.filter((incident) => incident.categoryId === "sos").length,
  };
}

const URGENCY_RANK: Record<Incident["urgency"], number> = { high: 0, medium: 1, low: 2 };

// A locked BDRRMO list's order: within one barangay distance barely
// differs, so what matters first -- SOS, then urgency, then newest.
export function sortForBarangay(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => {
    const sos = Number(b.categoryId === "sos") - Number(a.categoryId === "sos");
    if (sos !== 0) return sos;
    const urgency = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (urgency !== 0) return urgency;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}
