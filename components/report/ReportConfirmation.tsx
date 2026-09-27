import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import PrimaryButton from "@/components/auth/PrimaryButton";
import RippleRings from "@/components/common/RippleRings";
import { getCategory, type CategoryId } from "@/components/report/categories";
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
          {/* A page glyph with a folded top-right corner (cut as negative
              space, revealing the circle behind it) and a checkmark, both
              drawn in the circle's own color on a white page -- no single
              Ionicons glyph combines "document" and "checkmark". */}
          <Svg width={38} height={38} viewBox="0 0 24 24">
            <Path
              d="M8 3 L15 3 L20 8 L20 19 A2 2 0 0 1 18 21 L8 21 A2 2 0 0 1 6 19 L6 5 A2 2 0 0 1 8 3 Z"
              fill={COLORS.white}
            />
            <Path
              d="M15 3 V8 H20"
              stroke={COLORS.success}
              strokeWidth={1.3}
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M8.5 13 L11 15.5 L16 9.5"
              stroke={COLORS.success}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
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
            <Ionicons name={category.icon} size={20} color={category.color} />
          </View>
          <View style={styles.summaryTextCol}>
            <Text style={styles.categoryLabel}>{category.label}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color={COLORS.textTertiary} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.refChip}>
          <Text style={styles.refChipText}>Report #{refNumber}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          title="View Report History"
          trailingIcon="arrow-forward"
          onPress={onViewHistory}
        />
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBackHome();
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </Pressable>
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
      width: 80,
      height: 80,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.success,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: COLORS.white,
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
      marginBottom: SPACING.xl,
      ...SHADOW,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACING.sm,
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryTextCol: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    categoryLabel: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 4,
    },
    locationText: {
      flex: 1,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      lineHeight: 18,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.borderMuted,
      marginVertical: SPACING.sm,
    },
    refChip: {
      alignSelf: "flex-start",
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 5,
    },
    refChipText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    actions: {
      width: "100%",
      gap: SPACING.sm,
    },
    secondaryButton: {
      width: "100%",
      height: 56,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryButtonText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.text,
    },
  });
}
