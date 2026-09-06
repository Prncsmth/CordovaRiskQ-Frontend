// components/report-detail/InfoRow.tsx
// Label/value line used by the Report Detail screen's "Report Info" card.
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: SPACING.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderMuted,
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoLabel: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textTertiary,
    },
    infoValue: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      color: COLORS.text,
    },
  });
}
