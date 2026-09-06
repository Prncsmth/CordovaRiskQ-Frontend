// components/responder/BarangaySectionHeader.tsx
// Section header for one Barangay's group of incidents on the responder
// Dashboard -- shows the Barangay name, its active incident count, and a
// severity dot colored by the most urgent incident in the group (the
// group's incidents are already sorted urgency-first by
// groupIncidentsByBarangay, so incidents[0].urgency is that value).
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BarangayGroup } from "@/components/responder/groupIncidentsByBarangay";
import {
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Urgency } from "@/types/responder";

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
      <Text style={styles.name}>{group.name}</Text>
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
    name: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "800",
      color: COLORS.text,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    count: {
      marginLeft: "auto",
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      fontWeight: "600",
    },
  });
}
