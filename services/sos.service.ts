import { apiPost } from "./api";
import type { Coordinates } from "./location.service";

export type SosAlert = {
  id: string;
  status: string;
  createdAt: string;
};

export async function triggerSOS(
  token: string,
  location?: Coordinates,
  locationLabel?: string,
): Promise<SosAlert> {
  const response = await apiPost<{ success: true; alert: SosAlert }>(
    "/api/sos",
    { ...location, ...(locationLabel ? { locationLabel } : {}) },
    token,
  );
  return response.alert;
}
