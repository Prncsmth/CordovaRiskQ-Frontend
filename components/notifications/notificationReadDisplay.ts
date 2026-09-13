import type { ColorPalette } from "@/theme";

export function getNotificationReadDisplay(read: boolean, COLORS: ColorPalette) {
  return read
    ? { color: COLORS.textTertiary, bg: COLORS.surface, border: COLORS.borderMuted }
    : { color: COLORS.primary, bg: COLORS.primaryTint, border: COLORS.danger };
}
