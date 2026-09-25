// components/responder/incident-detail/DetailRow.tsx
// Label/value line used by LobbyView's "Details" tab and ArrivedView's
// summary card.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function DetailRow({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value: string;
  // Optional -- LobbyView's plain list keeps its existing icon-less look;
  // ArrivedView passes one per row for a quicker-to-scan summary.
  icon?: keyof typeof Ionicons.glyphMap;
  // Drops the bottom divider on the last row of a card so it doesn't sit
  // flush against the card's own bottom edge.
  last?: boolean;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <View style={styles.labelRow}>
        {icon ? (
          <Ionicons name={icon} size={14} color={COLORS.textTertiary} />
        ) : null}
        <Text style={styles.detailLabel}>{label}:</Text>
      </View>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      // flex-start, not center -- a wrapped two-line value (a long address)
      // should align to the top of the label, not float centered against it.
      alignItems: "flex-start",
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderMuted,
    },
    detailRowLast: {
      borderBottomWidth: 0,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      // Never shrink the label -- only the value should give up width.
      flexShrink: 0,
    },
    detailLabel: {
      color: COLORS.textTertiary,
      fontSize: TYPOGRAPHY.caption,
    },
    detailValue: {
      // Without flex/flexShrink, RN's default is not to shrink at all, so a
      // long value (e.g. a full street address) rendered past the card's
      // edge instead of wrapping within the space actually left for it.
      flex: 1,
      flexShrink: 1,
      marginLeft: SPACING.sm,
      color: COLORS.text,
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      textAlign: "right",
    },
  });
}
