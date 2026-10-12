import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { apiPatch } from "./api";
import { getNotifications, notificationsUnavailable } from "@/utils/safeNotifications";

// Registered at module scope so it takes effect the moment this module is
// first imported (via app/_layout.tsx's import chain), before any push
// notification can arrive. Without a handler, expo-notifications does not
// visually present an incoming remote notification while the app is in the
// foreground — it's delivered to JS but never shown to the user.
if (!notificationsUnavailable) {
  const Notifications = getNotifications()!;
  // Android routes every push without a channelId (the backend never sets
  // one) to the "default" channel -- create it ourselves, loud, before Expo
  // auto-creates a quieter one, so an incident/SOS push makes a sound and
  // pops up as a heads-up banner. Keeping the id "default" means an older
  // backend or app build still lands on a channel that exists (a push for
  // a missing channelId is dropped). Android fixes a channel's importance
  // once created, so a phone that already had the old one needs a
  // reinstall to pick this up.
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "Emergency alerts",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      enableVibrate: true,
      vibrationPattern: [0, 600, 400, 600],
      lightColor: "#C8102E",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch(() => {});
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications(token: string): Promise<void> {
  if (notificationsUnavailable || !Device.isDevice) return;
  const Notifications = getNotifications()!;

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
