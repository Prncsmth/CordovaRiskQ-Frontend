import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTour } from "@/context/TourContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, type ColorPalette } from "@/theme";

type AdvisoryBannerProps = {
  id: string;
  priority: "Normal" | "Urgent";
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
  const isUrgent = priority === "Urgent";

  useEffect(() => {
    registerTarget("alerts", anchorRef);
    return () => unregisterTarget("alerts", anchorRef);
  }, [registerTarget, unregisterTarget]);

  return (
    <Pressable
      style={styles.card}
      ref={anchorRef}
      collapsable={false}
      onLayout={() => notifyTargetLayout()}
      onPress={() => router.push({ pathname: "/announcement-detail/[id]", params: { id } })}
    >
      <View style={styles.iconCircle}>
        <Ionicons
          name="megaphone-outline"
          size={34}
          color={isUrgent ? COLORS.primary : COLORS.tide}
        />
      </View>
      <View style={styles.textCol}>
        <View style={styles.metaRow}>
          <Text style={[styles.label, isUrgent && styles.labelUrgent]}>
            {isUrgent ? "Urgent" : "Announcement"}
          </Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.dateText} numberOfLines={1}>
            {time}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
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
      color: COLORS.tide,
    },
    labelUrgent: {
      color: COLORS.primary,
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
