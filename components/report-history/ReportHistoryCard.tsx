import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ReportHistoryItem } from "@/services/report.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

type ReportHistoryCardProps = {
  item: ReportHistoryItem;
};

export default function ReportHistoryCard({ item }: ReportHistoryCardProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: item.statusBg }]}>
        <Ionicons name="document-text" size={18} color={item.statusColor} />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.category} numberOfLines={1}>
          {item.category}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.location}
        </Text>
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

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: SPACING.md,
    ...SHADOW,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.caption,
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
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  });
}
