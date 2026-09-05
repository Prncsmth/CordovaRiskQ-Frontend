import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getReportStatusDisplay } from "@/components/report/reportStatusDisplay";
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
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { label, color, bg } = getReportStatusDisplay(item.status, COLORS);

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/report-detail/${item.id}`)}
    >
      <View style={[styles.iconCircle, { backgroundColor: bg }]}>
        <Ionicons name="document-text" size={18} color={color} />
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

      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[styles.pillText, { color }]}>{label}</Text>
      </View>
    </Pressable>
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
