import { Stack } from "expo-router";

// Declares the fullScreenModal presentation ahead of time, matching the
// pattern already used by app/evacuation-detail/_layout.tsx and
// app/responder/_layout.tsx -- without this, the navigator first mounts
// [id] as a normal push (its default in the root Stack, which doesn't
// know about this route), and only switches to a modal once the screen's
// own inline <Stack.Screen> renders. Since [id].tsx re-renders
// continuously (a 1s clock tick plus a 4s tracking poll, for as long as
// the screen stays open), that inline options object is a fresh reference
// every render, and each one told the navigator to switch presentation
// again -- a continuous re-present/undo cycle with no JS error, visible
// as the screen bouncing between itself and whatever presented it.
export default function TrackResponderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[id]"
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
