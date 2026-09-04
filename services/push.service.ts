import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { apiPatch } from "./api";

export async function registerForPushNotifications(token: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await apiPatch("/api/users/push-token", { token: pushToken }, token);
}
