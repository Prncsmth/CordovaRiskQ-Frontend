// services/contacts.service.ts
// Wraps GET /api/hotlines -- a real, already-implemented backend endpoint
// (hotlineService.list, seeded with the same 6 Cordova, Cebu agencies this
// file used to hardcode -- see prisma/seed.ts on the backend, whose ids
// match app/contacts/index.tsx's icon/color/image lookups exactly).
import { apiGet } from "./api";

export type HotlineCategory = "police" | "fire" | "medical" | "maritime";

export type Hotline = {
  id: string;
  name: string;
  number: string;
  category: HotlineCategory;
};

type HotlineApiRow = {
  id: string;
  name: string;
  number: string;
  category: string;
};

function toHotline(row: HotlineApiRow): Hotline {
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    // Cast assumes the backend only ever writes one of the known category
    // strings -- but unlike EvacuationCenter.category, Hotline.category has
    // no DB check constraint and no admin UI validating it (edits are a
    // direct DB write per the hotlines backend spec), so a bad/typo'd value
    // is possible here. Callers must handle an unrecognized category
    // gracefully (see app/contacts/index.tsx's "Other" fallback group).
    category: row.category as HotlineCategory,
  };
}

export async function getHotlines(token: string): Promise<Hotline[]> {
  const response = await apiGet<{ success: true; hotlines: HotlineApiRow[] }>(
    "/api/hotlines",
    token,
  );
  return response.hotlines.map(toHotline);
}
