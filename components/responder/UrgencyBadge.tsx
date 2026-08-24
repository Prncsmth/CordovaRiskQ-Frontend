import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import {
  RADIUS,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Urgency } from "@/types/responder";

// Hand-picked darker shade of a theme color, used as the second gradient
// stop so each urgency pill reads as a solid, high-contrast capsule rather
// than a flat tint -- mirrors the SOSButton/PrimaryButton gradient-fill
// treatment. Computed at render time so it tracks light/dark mode.
function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function getUrgencyStyles(
  COLORS: ColorPalette,
): Record<Urgency, { colors: [string, string]; label: string }> {
  return {
    high: { colors: [COLORS.primary, COLORS.primaryDark], label: "High" },
    medium: {
      colors: [COLORS.warning, darken(COLORS.warning, 40)],
      label: "Medium",
    },
    low: { colors: [COLORS.success, darken(COLORS.success, 40)], label: "Low" },
  };
}

export default function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { colors, label } = getUrgencyStyles(COLORS)[urgency];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { shadowColor: colors[1] }]}
    >
      <Text style={styles.text}>{label}</Text>
    </LinearGradient>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
      alignSelf: "flex-start",
      shadowOpacity: 0.28,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    text: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.white,
      letterSpacing: 0.2,
    },
  });
}
