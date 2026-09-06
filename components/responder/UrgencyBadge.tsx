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

import { darken } from "./colorUtils";

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
