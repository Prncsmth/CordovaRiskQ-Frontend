import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTour } from "@/context/TourContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, type ColorPalette } from "@/theme";
import { severityStyle, toSeverity } from "@/utils/announcementSeverity";

type AdvisoryBannerProps = {
  id: string;
  // The backend's severity (see utils/announcementSeverity.ts).
  priority: string;
  time: string;
  title: string;
  message: string;
};

export default function AdvisoryBanner({
  id,
  priority,
  time,
  title,
  message,
}: AdvisoryBannerProps) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { registerTarget, unregisterTarget, notifyTargetLayout } = useTour();
  const anchorRef = useRef<View>(null);
  const severity = severityStyle(toSeverity(priority), COLORS);

  useEffect(() => {
    registerTarget("alerts", anchorRef);
    return () => unregisterTarget("alerts", anchorRef);
  }, [registerTarget, unregisterTarget]);

  return (
    <Pressable
      // The card itself stays neutral; only the bullhorn and label carry
      // the severity color.
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${severity.label}: ${title}`}
      ref={anchorRef}
      collapsable={false}
      onLayout={() => notifyTargetLayout()}
      onPress={() => router.push({ pathname: "/announcement-detail/[id]", params: { id } })}
    >
      <View style={styles.iconCircle}>
        {/* Always the announcement bullhorn; only its color follows the
            severity (blue info, amber warning, red critical). */}
        <Ionicons name="megaphone-outline" size={34} color={severity.color} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.metaRow}>
          <Text style={[styles.label, { color: severity.color }]}>{severity.label}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.dateText} numberOfLines={1}>
            {time}
          </Text>
        </View>
        {/* A critical alert's title gets room for a second line. */}
        <Text style={styles.title} numberOfLines={severity.prominent ? 2 : 1}>
          {title}
        </Text>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm + 4,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingVertical: SPACING.sm + 4,
      paddingLeft: SPACING.sm + 4,
      paddingRight: SPACING.md,
      ...SHADOW,
    },
    iconCircle: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    label: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
    },
    separator: {
      fontSize: 8,
      lineHeight: 16,
      color: COLORS.textTertiary,
    },
    dateText: {
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 16,
      color: COLORS.textTertiary,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: 15,
      lineHeight: 20,
      color: COLORS.text,
    },
    message: {
      fontSize: 13,
      lineHeight: 18,
      color: COLORS.textSecondary,
    },
  });
}
