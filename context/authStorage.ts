import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// expo-secure-store has no web implementation (its web build is an empty
// stub), so native platforms use SecureStore and web falls back to
// localStorage. localStorage is NOT secure storage -- dev/web convenience
// only, matching this app's current web support level.

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
