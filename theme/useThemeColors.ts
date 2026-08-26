import { useThemeMode } from "@/context/ThemeContext";

import { DARK_COLORS, LIGHT_COLORS } from "./colors";

export function useThemeColors() {
  const { theme } = useThemeMode();
  return theme === "dark" ? DARK_COLORS : LIGHT_COLORS;
}

export function useIsDarkTheme() {
  const { theme } = useThemeMode();
  return theme === "dark";
}
