// services/evacuation.service.ts
// Wraps GET /api/evacuation-centers -- a real, already-implemented backend
// endpoint (evacuationCenterService.list, seeded from the same Cordova,
// Cebu facility data this file used to hardcode -- see prisma/seed.ts on
// the backend, whose ids match PHOTO_BY_ID below exactly). There's no
// per-id route, so getEvacuationCenterById fetches the list and finds by
// id client-side, same as the old in-memory array did.
import type { ImageSourcePropType } from "react-native";

import { apiGet } from "./api";

export type EvacuationCenterCategory = "school" | "evacuation_center";

export type EvacuationCenter = {
  id: string;
  name: string;
  address: string;
  category: EvacuationCenterCategory;
  distanceKm: number;
  status: "open" | "full";
  facilities: string[];
  latitude: number;
  longitude: number;
  photo?: ImageSourcePropType;
};

type EvacuationCenterApiRow = {
  id: string;
  name: string;
  address: string;
  category: string;
  facilities: string[];
  latitude: number;
  longitude: number;
  status: string;
};

// The backend model has no photo field -- these two centers' photos are a
// client-only presentation detail, keyed by the same fixed ids the backend
// seed uses.
const PHOTO_BY_ID: Record<string, ImageSourcePropType> = {
  "cordova-sports-complex": require("@/assets/images/complex.png"),
  "buagsong-elementary": require("@/assets/images/buagsong.png"),
};

function toEvacuationCenter(row: EvacuationCenterApiRow): EvacuationCenter {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    // Cast is safe -- the backend only ever writes these two category
    // strings (see prisma/schema.prisma's comment on EvacuationCenter).
    category: row.category as EvacuationCenterCategory,
    // The backend doesn't store distance -- callers with a live device fix
    // (home.tsx, evacuation-detail/[id].tsx) overwrite this immediately.
    distanceKm: 0,
    status: row.status as "open" | "full",
    facilities: row.facilities,
    latitude: row.latitude,
    longitude: row.longitude,
    photo: PHOTO_BY_ID[row.id],
  };
}

export async function getEvacuationCenters(token: string): Promise<EvacuationCenter[]> {
  const response = await apiGet<{ success: true; centers: EvacuationCenterApiRow[] }>(
    "/api/evacuation-centers",
    token,
  );
  return response.centers.map(toEvacuationCenter);
}

export async function getEvacuationCenterById(
  token: string,
  id: string,
): Promise<EvacuationCenter | undefined> {
  const centers = await getEvacuationCenters(token);
  return centers.find((c) => c.id === id);
}
