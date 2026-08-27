// Display typeface — Sora, loaded via @expo-google-fonts/sora in
// app/_layout.tsx. Used sparingly for screen titles, hero moments, and the
// SOS overlay; body copy stays on the system font for legibility.
//
// `wordmark` (Archivo Black, via @expo-google-fonts/archivo-black) is used
// only for the "CORDOVA RISKQ" brand lettering in HomeHeader, matching the
// weight of the app's logo artwork. It ships a single 400 cut that already
// renders as a heavy black weight -- don't pair it with fontWeight.
export const FONT_FAMILY = {
  displaySemibold: "Sora_600SemiBold",
  display: "Sora_700Bold",
  wordmark: "ArchivoBlack_400Regular",
};
