import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { API_BASE_URL, apiPatch } from "./api";

// Remote push notifications were removed from Expo Go on Android in SDK 53+;
// calling into expo-notifications there throws. iOS Expo Go is unaffected —
// only Android needs a development build for remote push.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const remotePushUnsupported = Platform.OS === "android" && isExpoGo;

// Registered at module scope so it takes effect the moment this module is
// first imported (via app/_layout.tsx's import chain), before any push
// notification can arrive. Without a handler, expo-notifications does not
// visually present an incoming remote notification while the app is in the
// foreground — it's delivered to JS but never shown to the user.
if (!remotePushUnsupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// TODO(push-debug): temporary instrumentation added to trace why
// User.pushToken stays NULL for citizen accounts -- remove once resolved.
export async function registerForPushNotifications(token: string): Promise<void> {
  console.log("[push-debug] registerForPushNotifications called", {
    platform: Platform.OS,
    isExpoGo,
    remotePushUnsupported,
    isDevice: Device.isDevice,
  });

  if (remotePushUnsupported || !Device.isDevice) {
    console.log("[push-debug] bailing early: remotePushUnsupported or not a physical device");
    return;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  console.log("[push-debug] requestPermissionsAsync status:", status);
  if (status !== "granted") {
    console.log("[push-debug] bailing early: permission not granted");
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  console.log("[push-debug] projectId:", projectId);
  if (!projectId) {
    console.log("[push-debug] bailing early: no projectId in Constants.expoConfig.extra.eas");
    return;
  }

  let pushToken: string;
  try {
    pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("[push-debug] getExpoPushTokenAsync succeeded:", pushToken);
  } catch (err) {
    console.log("[push-debug] getExpoPushTokenAsync threw:", err);
    throw err;
  }

  // The backend already sends real Expo push notifications from here: this
  // PATCH stores the token on the user record, and notification.service.ts
  // (server-side) looks it up and calls Expo's push API whenever it creates
  // a notification for this user -- e.g. an on-duty responder's token gets
  // a real push the moment a citizen triggers SOS. Delivery to a closed app
  // is handled by the OS once the token is registered; setNotificationHandler
  // above only controls how a push is presented while the app is foregrounded.
  const url = `${API_BASE_URL}/api/users/push-token`;
  console.log("[push-debug] PATCH firing:", url);
  try {
    await apiPatch("/api/users/push-token", { token: pushToken }, token);
    console.log("[push-debug] PATCH succeeded:", url);
  } catch (err) {
    console.log("[push-debug] PATCH failed:", {
      url,
      status: (err as Partial<{ status: number }>)?.status,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
