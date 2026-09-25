// context/NotificationContext.tsx
// App-wide notification feed: one fetch + one socket connection shared by
// the Home bell badge (needs only hasUnread) and the Notifications screen
// (needs the full list), instead of each screen fetching independently --
// two ad-hoc GETs can't both cheaply become live without duplicating the
// socket-subscription logic twice.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { connectToNotificationSocket } from "@/services/notificationSocket.service";
import {
  deleteNotification as deleteNotificationRequest,
  getNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "@/services/notification.service";
import { addIncomingNotification } from "@/utils/notifications";

type NotificationContextValue = {
  notifications: AppNotification[];
  isLoading: boolean;
  loadFailed: boolean;
  hasUnread: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => void;
  deleteNotification: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoadFailed(false);
    try {
      const result = await getNotifications(token);
      setNotifications(result);
    } catch {
      setLoadFailed(true);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      // Resetting state when auth drops (e.g. logout) is the same pattern
      // ResponderAlertContext.tsx already uses -- intentional, not
      // derivable without an effect since it reacts to an external change.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([]);
      setIsLoading(false);
      setLoadFailed(false);
      return;
    }

    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));

    const disconnect = connectToNotificationSocket(
      token,
      (incoming) => setNotifications((prev) => addIncomingNotification(prev, incoming)),
      // Reconnecting means the socket was down for some stretch of time --
      // refetch once to catch anything created while disconnected.
      () => refresh(),
    );

    return disconnect;
  }, [token, refresh]);

  const markAllRead = useCallback(() => {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead(token).catch(() => {});
  }, [token]);

  const deleteNotification = useCallback(
    async (id: string) => {
      if (!token) return;
      await deleteNotificationRequest(token, id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    [token],
  );

  const hasUnread = notifications.some((n) => !n.read);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      isLoading,
      loadFailed,
      hasUnread,
      refresh,
      markAllRead,
      deleteNotification,
    }),
    [notifications, isLoading, loadFailed, hasUnread, refresh, markAllRead, deleteNotification],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
