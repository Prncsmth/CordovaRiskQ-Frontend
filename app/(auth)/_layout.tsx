import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ThemeProvider } from "@/context/ThemeContext";
import { LIGHT_COLORS } from "@/theme/colors";

export default function AuthLayout() {
  return (
    <ThemeProvider forceLight>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: LIGHT_COLORS.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </ThemeProvider>
  );
}
