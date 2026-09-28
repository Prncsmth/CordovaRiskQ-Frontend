import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import {
  RADIUS,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Urgency } from "@/responder/types/responder";

function getUrgencyStyles(
  COLORS: ColorPalette,
): Record<Urgency, { color: string; label: string }> {
  return {
    high: { color: COLORS.primary, label: "High" },
    medium: { color: COLORS.warning, label: "Medium" },
    low: { color: COLORS.success, label: "Low" },
  };
}

// Flat solid fill, no gradient/shadow -- a card already carries urgency via
// its own left-border color (see IncidentCard.tsx), so this badge is just
// the text label, not a second competing "look at me" affordance.
export default function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { color, label } = getUrgencyStyles(COLORS)[urgency];

  return (
    <Text style={[styles.badge, { backgroundColor: color }]}>{label}</Text>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
      alignSelf: "flex-start",
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.white,
      letterSpacing: 0.2,
      overflow: "hidden",
    },
  });
}
