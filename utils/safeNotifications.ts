// Merely importing expo-notifications crashes the app on Android when
// running in Expo Go: its package entry re-exports
// DevicePushTokenAutoRegistration.fx, which registers a push-token listener
// at module scope -- and that listener synchronously throws (expo-notifications'
// own warnOfExpoGoPushUsage guard) the instant the module loads, before any
// application code runs. A runtime check around individual API calls can't
// prevent this, since the crash happens on import, not on use. Requiring the
// module lazily, only when we're not on Android Expo Go, is the only way to
// keep that side effect from ever running.
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export const notificationsUnavailable =
  Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import("expo-notifications");

let cached: NotificationsModule | null = null;

export function getNotifications(): NotificationsModule | null {
  if (notificationsUnavailable) return null;
  if (!cached) {
    cached = require("expo-notifications") as NotificationsModule;
  }
  return cached;
}
