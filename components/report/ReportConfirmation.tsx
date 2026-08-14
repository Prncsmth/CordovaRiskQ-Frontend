import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { getCategory, type CategoryId } from "@/components/report/categories";
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

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

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark" size={32} color={COLORS.success} />
      </View>
      <Text style={styles.heading}>Report Submitted</Text>
      <Text style={styles.subtitle}>
        Responders have been notified and are reviewing your report.
      </Text>

      <View style={styles.summaryRow}>
        <Ionicons name={category.icon} size={16} color={category.color} />
        <Text style={styles.summaryText}>
          {category.label} · {location}
        </Text>
      </View>
      <Text style={styles.refText}>Report #{refNumber}</Text>

      <View style={styles.actions}>
        <PrimaryButton title="View Report History" onPress={onViewHistory} />
        <TouchableOpacity onPress={onBackHome} hitSlop={8} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  summaryText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  refText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginBottom: SPACING.lg,
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
