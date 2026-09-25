import type { EvacuationCenter } from "@/services/evacuation.service";

// Merges an evacuation-center update pushed live over the socket (see
// context/EvacuationCenterContext.tsx) into the already-fetched list. Only
// status/facilities can ever change -- that's all PATCH
// /admin/evacuation-centers/:id accepts -- so every other client-only field
// (distanceKm, photo, etc.) on the matching center is preserved untouched.
export function applyEvacuationCenterUpdate(
  existing: EvacuationCenter[],
  update: { id: string; status: EvacuationCenter["status"]; facilities: string[] },
): EvacuationCenter[] {
  return existing.map((center) =>
    center.id === update.id
      ? { ...center, status: update.status, facilities: update.facilities }
      : center,
  );
}
