// services/advisory.service.ts
import { apiGet, type ApiError } from "./api";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "Normal" | "Urgent";
  createdAt: string;
  // Not every backend row carries these -- author comes from the
  // createdBy relation (GET /api/announcements/:id only, not /active), and
  // imageUrl has no backing column yet, so it's always undefined today.
  // Optional here so the detail screen can render either conditionally.
  author?: string | null;
  imageUrl?: string | null;
};

export async function getActiveAnnouncement(barangayName?: string): Promise<Announcement | null> {
  const query = barangayName ? `?barangay=${encodeURIComponent(barangayName)}` : "";
  const response = await apiGet<{ success: true; announcement: Announcement | null }>(
    `/api/announcements/active${query}`,
  );
  return response.announcement;
}

// The responder dashboard's card: newest of "All Users" and "Responders
// Only". Needs the responder's token -- the backend keeps Responders Only
// announcements off the public /active endpoint above.
export async function getActiveResponderAnnouncement(token: string): Promise<Announcement | null> {
  const response = await apiGet<{ success: true; announcement: Announcement | null }>(
    "/api/announcements/active/responder",
    token,
  );
  return response.announcement;
}

// Backs the Announcement Details screen (app/announcement-detail/[id].tsx),
// reached from a tapped "announcement" notification's referenceId or the
// home/dashboard card. Public for most audiences; the token is sent when
// signed in because the backend only shows a Responders Only announcement to
// a signed-in responder (anyone else gets the same 404 as a missing one).
export async function getAnnouncementById(
  id: string,
  token?: string | null,
): Promise<Announcement | undefined> {
  try {
    const response = await apiGet<{ success: true; announcement: Announcement }>(
      `/api/announcements/${id}`,
      token ?? undefined,
    );
    return response.announcement;
  } catch (err) {
    // Only a real 404 means "no such announcement" -- same distinction
    // getReportDetailById makes, so the screen can tell a genuine 404 apart
    // from a network/server failure and offer a retry instead of silently
    // looking like the announcement doesn't exist.
    if ((err as Partial<ApiError>)?.status === 404) {
      return undefined;
    }
    throw err;
  }
}
