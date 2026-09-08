import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiPatch } from "./api";

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

export async function registerForPushNotifications(token: string): Promise<void> {
  if (remotePushUnsupported || !Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await apiPatch("/api/users/push-token", { token: pushToken }, token);
}
