// services/notification.service.ts
import { apiGet, apiPatch } from "./api";

export type NotificationType = "announcement" | "incident_status" | "tide_risk";

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
