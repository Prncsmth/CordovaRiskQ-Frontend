import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { getCategory, type CategoryId } from "@/components/report/categories";
import RippleRings from "@/components/common/RippleRings";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useIsDarkTheme,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

type ReportConfirmationProps = {
  categoryId: CategoryId;
  location: string;
  refNumber: string;
  onViewHistory: () => void;
  onBackHome: () => void;
};

export default function ReportConfirmation({
  categoryId,
  location,
  refNumber,
  onViewHistory,
  onBackHome,
}: ReportConfirmationProps) {
  const category = getCategory(categoryId);
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const rippleColor = isDark
    ? "rgba(52, 211, 153, 0.18)"
    : "rgba(30, 142, 62, 0.14)";

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <RippleRings
          size={140}
          color={rippleColor}
          ringCount={2}
          style={styles.ripple}
        />
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={32} color={COLORS.success} />
        </View>
      </View>
      <Text style={styles.heading}>Report Submitted</Text>
      <Text style={styles.subtitle}>
        Responders have been notified and are reviewing your report.
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View
            style={[styles.categoryIcon, { backgroundColor: `${category.color}1A` }]}
          >
            <Ionicons name={category.icon} size={16} color={category.color} />
          </View>
          <Text style={styles.summaryText}>
            {category.label} · {location}
          </Text>
        </View>
        <Text style={styles.refText}>Report #{refNumber}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="View Report History" onPress={onViewHistory} />
        <TouchableOpacity onPress={onBackHome} hitSlop={8} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  iconWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  ripple: {
    position: "absolute",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.background,
    ...SHADOW_LG,
  },
  heading: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    width: "100%",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOW,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: {
    flex: 1,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  refText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginLeft: 36,
  },
  actions: {
    width: "100%",
  },
  backLink: {
    alignItems: "center",
    marginTop: SPACING.md,
  },
  backLinkText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  });
}
