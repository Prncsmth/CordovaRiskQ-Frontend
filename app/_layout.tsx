import {
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from "@expo-google-fonts/sora";
import SosOverlay from "@/components/sos/SosOverlay";
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Watches auth state and redirects to the right screen group.
// Runs after AuthContext has finished checking SecureStore on startup.
function RootLayoutNav() {
  const { isAuthenticated, isLoading, needsOnboarding, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inResponderGroup = segments[0] === "responder";
    const onPhoneNumber = segments[0] === "phone-number";

    if (!isAuthenticated) {
      // Cold launch should land on the public onboarding welcome screen so the
      // first screen in Expo Go is the welcome flow instead of the auth form.
      // Logged-out deep links or a stale route outside the auth group are still
      // normalized back to the first onboarding state.
      if (!inAuthGroup && !inOnboardingGroup) {
        router.replace("/(onboarding)/welcome");
      }
      return;
    }

    if (needsOnboarding) {
      // Freshly registered (or first-time Google sign-in) -> the account
      // exists but has no phone number yet. Send there and nowhere else,
      // until phone-number.tsx calls completeOnboarding(). This flag flips
      // atomically with isAuthenticated inside AuthContext.login(), so this
      // redirect can't race the router's own internal navigation queue the
      // way a caller-side router.push() used to. Phone number collection
      // lives outside the (onboarding) group -- it needs a token to save
      // against, so it can only run post-registration, not during the
      // pre-account welcome/terms walkthrough.
      if (!onPhoneNumber) {
        router.replace("/phone-number");
      }
      return;
    }

    const role = user?.role ?? "citizen";
    const homeRoute = role === "responder" ? "/responder" : "/(tabs)/home";

    if (role === "responder" && !inResponderGroup) {
      // Responder account sitting outside its own flow (auth/onboarding
      // screen, or the civilian tabs) -> send it to the responder home.
      router.replace(homeRoute);
      return;
    }

    if (role === "citizen" && inResponderGroup) {
      // A citizen account should never end up inside the responder flow
      // (e.g. a stale deep link) -> bounce back to the civilian tabs.
      router.replace(homeRoute);
      return;
    }

    if (inAuthGroup || inOnboardingGroup) {
      // Authenticated and onboarded but sitting on an auth or onboarding
      // screen -> skip to the right home for this account's role.
      router.replace(homeRoute);
    }
  }, [isAuthenticated, isLoading, needsOnboarding, segments, user]);

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
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="responder" />
      <Stack.Screen name="phone-number" />
      <Stack.Screen name="getting-started/welcome" options={{ gestureEnabled: false }} />
      <Stack.Screen name="getting-started/tour" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="change-password/index"
        options={{
          presentation: "transparentModal",
          animation: "fade",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <UserProvider>
          <AppThemeProvider>
            <NavigationThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <SosProvider>
                <RootLayoutNav />
                <SosOverlay />
                <StatusBar style="auto" />
              </SosProvider>
            </NavigationThemeProvider>
          </AppThemeProvider>
        </UserProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
