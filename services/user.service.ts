import { apiGet, apiPatch, apiPost, apiPut } from "./api";

export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  mobile: string | null;
};

export async function getProfile(token: string): Promise<UserProfile> {
  const response = await apiGet<{ success: true; user: UserProfile }>(
    "/api/users/me",
    token,
  );
  return response.user;
}

export async function updateProfile(
  token: string,
  payload: { name?: string; email: string; mobile?: string },
): Promise<UserProfile> {
  const response = await apiPut<{ success: true; user: UserProfile }>(
    "/api/users/me",
    payload,
    token,
  );
  return response.user;
}

// Changing the password logs out every session for this account, including
// this one -- the backend returns a fresh token for this device. Optional
// because a backend from before session revocation doesn't send one (its
// old token is then still valid).
export async function changePassword(
  token: string,
  payload: { oldPassword: string; newPassword: string },
): Promise<{ token?: string }> {
  const result = await apiPost<{ success: true; token?: string }>(
    "/api/users/change-password",
    payload,
    token,
  );
  return { token: result.token };
}

export async function updateDutyStatus(
  token: string,
  isOnDuty: boolean,
): Promise<void> {
  await apiPatch<{ success: true }>(
    "/api/users/duty-status",
    { isOnDuty },
    token,
  );
}
