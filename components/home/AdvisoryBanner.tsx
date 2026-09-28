import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTour } from "@/context/TourContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

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
        <Image
          source={require("@/assets/images/riskq.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textCol}>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, isUrgent && styles.metaUrgent]} numberOfLines={1}>
            {isUrgent ? "Urgent announcement" : "Announcement"} · {time}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.textTertiary} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
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
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm + 2,
      ...SHADOW,
    },
    iconCircle: {
      width: 26,
      height: 26,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      borderWidth: 1,
      borderColor: COLORS.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    logoImage: {
      width: 14,
      height: 14,
    },
    textCol: {
      flex: 1,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
    },
    meta: {
      flex: 1,
      fontSize: 11,
      fontWeight: "700",
      color: COLORS.tide,
      letterSpacing: 0.2,
    },
    metaUrgent: {
      color: COLORS.primary,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.text,
      marginTop: 1,
    },
    message: {
      fontSize: 11,
      color: COLORS.textSecondary,
      marginTop: 1,
    },
  });
}
