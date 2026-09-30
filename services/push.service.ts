import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { apiPatch } from "./api";

// Remote push notifications were removed from Expo Go on Android in SDK 53+.
// As of SDK 53, the failure isn't limited to calling specific APIs -- merely
// *importing* expo-notifications now throws there too (its native module
// registration itself fails), which crashed every consumer's static
// `import * as Notifications from "expo-notifications"` at module-load time
// (see context/ResponderAlertContext.tsx and hooks/useNotificationDeepLink.ts,
// both of which import this flag instead of recomputing it). iOS Expo Go is
// unaffected -- only Android needs a development build for remote push. A
// static `import type` for the module's TypeScript types is still safe
// everywhere (erased at compile time, never touches the native module).
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const remotePushUnsupported = Platform.OS === "android" && isExpoGo;

// Must stay a runtime require(), gated on the check above -- a static import
// is hoisted and evaluated eagerly, so it would throw before
// remotePushUnsupported could ever be checked.
type NotificationsModule = typeof import("expo-notifications");
let Notifications: NotificationsModule | undefined;
if (!remotePushUnsupported) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications");
}

// Registered at module scope so it takes effect the moment this module is
// first imported (via app/_layout.tsx's import chain), before any push
// notification can arrive. Without a handler, expo-notifications does not
// visually present an incoming remote notification while the app is in the
// foreground — it's delivered to JS but never shown to the user.
if (!remotePushUnsupported) {
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications(token: string): Promise<void> {
  if (remotePushUnsupported || !Device.isDevice) return;

  const { status } = await Notifications!.requestPermissionsAsync();
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const pushToken = (await Notifications!.getExpoPushTokenAsync({ projectId })).data;

  // The backend already sends real Expo push notifications from here: this
  // PATCH stores the token on the user record, and notification.service.ts
  // (server-side) looks it up and calls Expo's push API whenever it creates
  // a notification for this user -- e.g. an on-duty responder's token gets
  // a real push the moment a citizen triggers SOS. Delivery to a closed app
  // is handled by the OS once the token is registered; setNotificationHandler
  // above only controls how a push is presented while the app is foregrounded.
  await apiPatch("/api/users/push-token", { token: pushToken }, token);
}

// Push-notifications opt-out: clears the stored Expo push token so the
// backend stops sending this device anything, rather than only skipping a
// future re-registration (registerForPushNotifications simply wasn't called
// again -- the previously-registered token stayed live server-side).
export async function unregisterPushNotifications(token: string): Promise<void> {
  await apiPatch("/api/users/push-token", { token: null }, token);
}
