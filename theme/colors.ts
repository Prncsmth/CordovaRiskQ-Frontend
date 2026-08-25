export type ColorPalette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryTint: string;

  secondary: string;

  tide: string;
  tideTint: string;

  background: string;
  surface: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textFaint: string;

  gray: string;

  border: string;
  borderMuted: string;
  inputBg: string;

  white: string;
  black: string;

  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;

  google: string;

  // Non-token literals used around the app (gradients / glass overlays) that
  // need a theme-aware counterpart. Kept alongside the semantic tokens above
  // so every screen can pull its whole palette -- light or dark -- from one
  // object instead of branching on `theme` ad hoc.
  heroGradient: readonly [string, string, string];
  iconTileGradient: readonly [string, string];
  glassTint: "light" | "dark";
  glassOverlay: string;
  glassBorder: string;
  sheenOverlay: string;
  scrim: string;
};

export const LIGHT_COLORS: ColorPalette = {
  primary: "#C8102E",
  primaryDark: "#9C0C24",
  primaryLight: "#F8E2E6",
  primaryTint: "#FAE7EA",

  secondary: "#FF6B35",

  // Tide — deep mangrove-channel teal, the app's informational/secondary
  // accent. Keeps primary red reserved exclusively for danger/SOS.
  tide: "#0E7B86",
  tideTint: "#E3F4F3",

  background: "#FFFFFF",
  surface: "#F5F7F8",

  text: "#17181A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textFaint: "#C7C5C1",

  gray: "#9CA3AF",

  border: "#E6E9EB",
  borderMuted: "#EEF1F2",
  inputBg: "#F7F9FA",

  white: "#FFFFFF",
  black: "#000000",

  success: "#1E8E3E",
  successBg: "#EAF7EE",
  warning: "#B45309",
  warningBg: "#FEF3E2",
  danger: "#DC2626",

  google: "#DB4437",

  heroGradient: ["#FFFFFF", "#FFF7F5", "#FDECEA"],
  iconTileGradient: ["#FEEEEC", "#FBDAD6"],
  glassTint: "light",
  glassOverlay: "rgba(255, 255, 255, 0.55)",
  glassBorder: "rgba(255, 255, 255, 0.7)",
  sheenOverlay: "rgba(255, 255, 255, 0.32)",
  scrim: "rgba(0, 0, 0, 0.25)",
};

export const DARK_COLORS: ColorPalette = {
  primary: "#FF4D6D",
  primaryDark: "#C8102E",
  primaryLight: "#3A1620",
  primaryTint: "#2E1418",

  secondary: "#FF8A5C",

  tide: "#4FD1C5",
  tideTint: "#123A3A",

  background: "#0B0B0D",
  surface: "#18191C",

  text: "#F5F6F7",
  textSecondary: "#A8ACB3",
  textTertiary: "#787D85",
  textFaint: "#4B4F56",

  gray: "#8A8F96",

  border: "#2A2C30",
  borderMuted: "#222327",
  inputBg: "#1A1B1E",

  white: "#FFFFFF",
  black: "#000000",

  success: "#34D399",
  successBg: "#123226",
  warning: "#FBBF24",
  warningBg: "#33260A",
  danger: "#F87171",

  google: "#DB4437",

  heroGradient: ["#0B0B0D", "#17110F", "#231414"],
  iconTileGradient: ["#2A1614", "#3A1C18"],
  glassTint: "dark",
  glassOverlay: "rgba(255, 255, 255, 0.08)",
  glassBorder: "rgba(255, 255, 255, 0.16)",
  sheenOverlay: "rgba(255, 255, 255, 0.14)",
  scrim: "rgba(0, 0, 0, 0.55)",
};

// Static, light-only palette. Prefer `useThemeColors()` for anything that
// renders UI -- this export only remains for non-component, non-reactive
// contexts (e.g. static config) that can't call a hook.
export const COLORS = LIGHT_COLORS;
