import { Stack } from "expo-router";

import { ThemeProvider } from "@/context/ThemeContext";
import { LIGHT_COLORS } from "@/theme/colors";

export default function OnboardingLayout() {
  return (
    <ThemeProvider forceLight>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: LIGHT_COLORS.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="app-intro" />
        <Stack.Screen name="registration-complete" />
        <Stack.Screen name="terms" />
      </Stack>
    </ThemeProvider>
  );
}
