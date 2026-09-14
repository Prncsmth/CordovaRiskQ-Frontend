// services/notification.service.ts
import { apiDelete, apiGet, apiPatch } from "./api";

export type NotificationType =
  | "announcement"
  | "incident_status"
  | "tide_risk"
  | "new_incident"
  | "roster_update"
  | "team_ring";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  referenceId: string | null;
  createdAt: string;
};

export async function getNotifications(token: string): Promise<AppNotification[]> {
  const response = await apiGet<{ success: true; notifications: AppNotification[] }>(
    "/api/notifications",
    token,
  );
  return response.notifications;
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiPatch("/api/notifications/read-all", {}, token);
}

// Contract assumed pending backend confirmation, same situation as
// uploadReportPhoto in report.service.ts: no DELETE /api/notifications/:id
// route exists on the backend yet, so calls here will fail (404/network
// error) until it's added. The UI only removes a notification locally once
// this actually succeeds -- see app/notifications/index.tsx.
export async function deleteNotification(token: string, id: string): Promise<void> {
  await apiDelete(`/api/notifications/${id}`, token);
}
