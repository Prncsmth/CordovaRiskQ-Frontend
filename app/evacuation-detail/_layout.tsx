import { Stack } from "expo-router";

import { useThemeColors } from "@/theme";

export default function EvacuationDetailLayout() {
  const COLORS = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="navigate"
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
