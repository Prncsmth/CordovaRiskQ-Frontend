import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ReportHistoryItem } from "@/services/report.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type ReportHistoryCardProps = {
  item: ReportHistoryItem;
};

export default function ReportHistoryCard({ item }: ReportHistoryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.textCol}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.location}>{item.location}</Text>
        <Text style={styles.meta}>
          {item.date} · {item.ref}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: item.statusBg }]}>
        <Text style={[styles.pillText, { color: item.statusColor }]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  location: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  meta: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  pill: {
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
  },
  pillText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
});
