import { ArchivoBlack_400Regular } from "@expo-google-fonts/archivo-black";
import {
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from "@expo-google-fonts/sora";
import FirstTimeGuideOverlay from "@/components/tour/FirstTimeGuideOverlay";
import SosOverlay from "@/components/sos/SosOverlay";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProfilePhotoProvider } from "@/context/ProfilePhotoContext";
import { ReportLocationProvider } from "@/context/ReportLocationContext";
import { SosProvider } from "@/context/SosContext";
import { ThemeProvider as AppThemeProvider, useThemeMode } from "@/context/ThemeContext";
import { TourProvider } from "@/context/TourContext";
import { UserProvider } from "@/context/UserContext";
import { useThemeColors } from "@/theme";
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
  const { isAuthenticated, isLoading, needsOnboarding, needsTerms, user } = useAuth();
  const COLORS = useThemeColors();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inResponderGroup = segments[0] === "responder";
    const inCitizenTabsGroup = segments[0] === "(tabs)";
    const onPhoneNumber = segments[0] === "phone-number";
    const onTerms = segments[0] === "(onboarding)" && segments[1] === "terms";

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

    if (needsTerms) {
      // Phone number is saved but Terms & Conditions hasn't been accepted
      // yet -> send there and nowhere else, same non-skippable pattern as
      // the needsOnboarding/phone-number gate above. Resolved by
      // completeTerms() inside (onboarding)/terms.tsx.
      if (!onTerms) {
        router.replace("/(onboarding)/terms");
      }
      return;
    }

    const role = user?.role ?? "citizen";
    const homeRoute = role === "responder" ? "/responder" : "/(tabs)/home";

    if (
      role === "responder" &&
      (inAuthGroup || inOnboardingGroup || inCitizenTabsGroup)
    ) {
      // Responder account sitting outside its own flow (auth/onboarding
      // screen, or the civilian tabs) -> send it to the responder home.
      // Shared utility routes (settings, contacts, user-profile, etc.) are
      // NOT part of "its own flow" in the narrow sense -- they're outside
      // the "responder" segment too, but responders are meant to reach
      // them (e.g. from the dashboard's settings button), so this only
      // guards the screens the comment above actually names.
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
  }, [isAuthenticated, isLoading, needsOnboarding, needsTerms, segments, user]);

  if (isLoading) {
    // Brief splash while we check SecureStore for a saved session
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    // Keyed on auth state: react-native-screens keeps previously-visited
    // screens (onboarding, login) mounted in the background for fast
    // back-navigation, so they can still be showing whatever theme was
    // active the last time they actually rendered -- e.g. the light mode
    // from before the user ever toggled dark mode, if they logged in
    // before switching it in Settings. Forcing a full remount on every
    // login/logout transition guarantees a fresh render that reads the
    // current theme instead of showing a stale one.
    <Stack key={isAuthenticated ? "authed" : "guest"} screenOptions={{ headerShown: false }}>
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

// Reads the app's own theme state (not the raw device scheme) so navigation
// chrome and the status bar stay in sync with the in-app dark-mode toggle.
function ThemedApp() {
  const { theme } = useThemeMode();

  return (
    <NavigationThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
      <TourProvider>
        <SosProvider>
          <RootLayoutNav />
          <SosOverlay />
          <FirstTimeGuideOverlay />
          <StatusBar style={theme === "dark" ? "light" : "dark"} />
        </SosProvider>
      </TourProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    ArchivoBlack_400Regular,
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
          <ProfilePhotoProvider>
            <ReportLocationProvider>
              <AppThemeProvider>
                <ThemedApp />
              </AppThemeProvider>
            </ReportLocationProvider>
          </ProfilePhotoProvider>
        </UserProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
