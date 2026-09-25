// components/responder/BarangaySectionHeader.tsx
// Section header for one Barangay's group of incidents on the responder
// Dashboard -- shows the Barangay name, its active incident count, and a
// severity dot colored by the most urgent incident in the group (the
// group's incidents are already sorted urgency-first by
// groupIncidentsByBarangay, so incidents[0].urgency is that value).
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BarangayGroup } from "@/responder/components/dashboard/groupIncidentsByBarangay";
import {
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Urgency } from "@/responder/types/responder";

function severityColor(urgency: Urgency, COLORS: ColorPalette): string {
  if (urgency === "high") return COLORS.primary;
  if (urgency === "medium") return COLORS.warning;
  return COLORS.success;
}

export default function BarangaySectionHeader({ group }: { group: BarangayGroup }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const topUrgency: Urgency = group.incidents[0]?.urgency ?? "low";

  return (
    <View style={styles.row}>
      <View
        style={[styles.dot, { backgroundColor: severityColor(topUrgency, COLORS) }]}
      />
      <Text style={styles.name} numberOfLines={1}>
        {group.name}
      </Text>
      <Text style={styles.count}>
        {group.incidents.length} Active Incident
        {group.incidents.length === 1 ? "" : "s"}
      </Text>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xs,
      backgroundColor: COLORS.surface,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: RADIUS.full,
    },
    // Without flex/flexShrink, a long barangay name had no width constraint
    // next to the count label, risking overflow at larger accessibility
    // font sizes -- numberOfLines above keeps it to one line, truncating
    // rather than pushing the count off the row.
    name: {
      flex: 1,
      flexShrink: 1,
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.textSecondary,
      letterSpacing: 0.2,
    },
    count: {
      // row's own `gap` already spaces this from `name` -- marginLeft:
      // "auto" isn't needed either now that `name` has flex:1 to fill the
      // remaining space itself.
      flexShrink: 0,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      fontWeight: "600",
    },
  });
}
