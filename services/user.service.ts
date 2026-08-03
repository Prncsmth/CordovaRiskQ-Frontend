import { apiGet, apiPost, apiPut } from "./api";

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

export async function changePassword(
  token: string,
  payload: { oldPassword: string; newPassword: string },
): Promise<void> {
  await apiPost<{ success: true }>(
    "/api/users/change-password",
    payload,
    token,
  );
}
