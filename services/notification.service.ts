// services/notification.service.ts
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  group: "today" | "earlier";
};

const NOTIFICATIONS: AppNotification[] = [
  {
    id: "1",
    title: "Tide Advisory",
    body: "Water levels rising along coastal barangays. Stay alert.",
    timestamp: "2h ago",
    group: "today",
  },
  {
    id: "2",
    title: "Evacuation Notice",
    body: "Barangay Poblacion placed under precautionary evacuation.",
    timestamp: "5h ago",
    group: "today",
  },
  {
    id: "3",
    title: "Report Update",
    body: "Your incident report #RQ-20411 has been reviewed.",
    timestamp: "Yesterday",
    group: "earlier",
  },
  {
    id: "4",
    title: "Weather Alert",
    body: "Heavy rainfall expected this weekend.",
    timestamp: "2d ago",
    group: "earlier",
  },
];

export async function getNotifications(): Promise<AppNotification[]> {
  return NOTIFICATIONS;
}
