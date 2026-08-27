import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type AdvisoryBannerProps = {
  signalLabel: string;
  time: string;
  title: string;
  message: string;
  sample?: boolean;
};

export default function AdvisoryBanner({
  signalLabel,
  time,
  title,
  message,
  sample,
}: AdvisoryBannerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name="warning" size={16} color={COLORS.white} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>ADVISORY · {signalLabel.toUpperCase()}</Text>
          <Text style={styles.time}>{time}</Text>
          {sample ? (
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleBadgeText}>SAMPLE</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      gap: SPACING.sm,
      backgroundColor: COLORS.warningBg,
      borderRadius: RADIUS.lg,
      padding: SPACING.sm + 2,
      ...SHADOW,
    },
    iconCircle: {
      width: 30,
      height: 30,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.warning,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    textCol: {
      flex: 1,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    meta: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      color: COLORS.warning,
      letterSpacing: 0.4,
    },
    time: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
    sampleBadge: {
      marginLeft: "auto",
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      backgroundColor: COLORS.borderMuted,
    },
    sampleBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: COLORS.textSecondary,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      marginTop: 2,
    },
    message: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
  });
}
