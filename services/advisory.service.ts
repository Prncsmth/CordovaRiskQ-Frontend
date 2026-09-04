// services/advisory.service.ts
import { apiGet } from "./api";

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "Normal" | "Urgent";
  createdAt: string;
};

export async function getActiveAnnouncement(barangayName?: string): Promise<Announcement | null> {
  const query = barangayName ? `?barangay=${encodeURIComponent(barangayName)}` : "";
  const response = await apiGet<{ success: true; announcement: Announcement | null }>(
    `/api/announcements/active${query}`,
  );
  return response.announcement;
}
