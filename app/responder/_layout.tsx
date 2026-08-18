import { Stack } from "expo-router";

export default function ResponderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
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
