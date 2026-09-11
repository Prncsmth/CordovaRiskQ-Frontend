// components/responder/incident-detail/DetailRow.tsx
// Label/value line used by LobbyView's "Details" tab.
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function DetailRow({ label, value }: { label: string; value: string }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderMuted,
    },
    detailLabel: {
      color: COLORS.textTertiary,
      fontSize: TYPOGRAPHY.caption,
    },
    detailValue: {
      color: COLORS.text,
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
    },
  });
}
