import { API_BASE_URL, apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./api";
import { guessPhotoMimeType, postPhotoWithTimeout, shrinkReportPhoto } from "./report.service";

export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  mobile: string | null;
  // False for a Google Sign-In account, which has no password to change.
  // Missing from a backend that predates it.
  hasPassword?: boolean;
  // True for any account that signs in with Google (Google-only, or an
  // email/password account later linked to it). Missing from an older backend.
  isGoogleAccount?: boolean;
  // A responder's admin-set unit ("BDRRMO" | "MDRRMO") and home barangay.
  // Missing from a backend that predates them.
  unit?: string | null;
  assignedBarangay?: string | null;
  // Optional profile photo (Cloudinary URL). Missing from an older backend.
  avatarUrl?: string | null;
};

export async function getProfile(token: string): Promise<UserProfile> {
  const response = await apiGet<{ success: true; user: UserProfile }>(
    "/api/users/me",
    token,
  );
  return response.user;
}

// The email can't be changed (the backend rejects a different one); it may
// still be sent unchanged, as phone-number.tsx's onboarding step does.
export async function updateProfile(
  token: string,
  payload: { name?: string; email?: string; mobile?: string },
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

// Profile photos are shown small (a contact card, a list row), so they're
// shrunk harder than a report photo before upload; the backend then crops a
// 400 px square around the face.
const AVATAR_MAX_EDGE_PX = 512;

// POST /api/users/me/avatar (multipart, field "photo"). Resolves the saved
// photo's URL; throws (with the server's message when it sent one) on any
// failure, so the caller can tell the user it didn't save.
export async function uploadAvatar(token: string, uri: string): Promise<string> {
  const photo = await shrinkReportPhoto(uri, "avatar.jpg", AVATAR_MAX_EDGE_PX);
  const formData = new FormData();
  formData.append("photo", {
    uri: photo.uri,
    name: photo.fileName,
    type: guessPhotoMimeType(photo.fileName),
  } as unknown as Blob);

  const response = await postPhotoWithTimeout(`${API_BASE_URL}/api/users/me/avatar`, token, formData);
  const data = (await response.json().catch(() => null)) as
    | { success?: boolean; avatarUrl?: string; message?: string }
    | null;
  if (!response.ok || !data?.avatarUrl) {
    throw new Error(data?.message ?? `Photo upload failed with status ${response.status}`);
  }
  return data.avatarUrl;
}

export async function removeAvatar(token: string): Promise<void> {
  await apiDelete("/api/users/me/avatar", token);
}
