import type { Hotline } from "@/services/contacts.service";

// Merges a hotline update pushed live over the socket (see
// context/HotlineContext.tsx) into the already-fetched list. Mirrors
// applyEvacuationCenterUpdate -- name/number/category are all PATCH
// /admin/hotlines/:id can ever change.
export function applyHotlineUpdate(
  existing: Hotline[],
  update: { id: string; name: string; number: string; category: Hotline["category"] },
): Hotline[] {
  return existing.map((hotline) =>
    hotline.id === update.id
      ? { ...hotline, name: update.name, number: update.number, category: update.category }
      : hotline,
  );
}
