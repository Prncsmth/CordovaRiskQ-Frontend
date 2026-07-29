import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SosProvider } from "@/context/SosContext";
import { ThemeProvider as AppThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Watches auth state and redirects to the right screen group.
// Runs after AuthContext has finished checking SecureStore on startup.
function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // No saved session -> force to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Already logged in but sitting on an auth screen -> skip to app
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    // Brief splash while we check SecureStore for a saved session
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <UserProvider>
        <AppThemeProvider>
          <NavigationThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <SosProvider>
              <RootLayoutNav />
              <StatusBar style="auto" />
            </SosProvider>
          </NavigationThemeProvider>
        </AppThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}
