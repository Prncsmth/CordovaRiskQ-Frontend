import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type AdvisoryBannerProps = {
  priority: "Normal" | "Urgent";
  time: string;
  title: string;
  message: string;
};

export default function AdvisoryBanner({
  priority,
  time,
  title,
  message,
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
          <Text style={styles.meta}>ANNOUNCEMENT · {priority === "Urgent" ? "URGENT" : "NOTICE"}</Text>
          <Text style={styles.time}>{time}</Text>
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
      gap: SPACING.sm + 2,
      backgroundColor: COLORS.warningBg,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
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
