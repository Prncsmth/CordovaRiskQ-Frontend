import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="phone-number" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
