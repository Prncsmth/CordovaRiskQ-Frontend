import { Stack } from "expo-router";

import { useThemeColors } from "@/theme";

export default function OnboardingLayout() {
  const COLORS = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="phone-number" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}
