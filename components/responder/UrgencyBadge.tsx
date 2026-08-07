import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, TYPOGRAPHY } from "@/theme";
import type { Urgency } from "@/types/responder";

const URGENCY_STYLES: Record<Urgency, { bg: string; text: string; label: string }> = {
  high: { bg: COLORS.primaryTint, text: COLORS.primary, label: "High" },
  medium: { bg: COLORS.warningBg, text: COLORS.warning, label: "Medium" },
  low: { bg: COLORS.successBg, text: COLORS.success, label: "Low" },
};

export default function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const { bg, text, label } = URGENCY_STYLES[urgency];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
});
