import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import RippleRings from "@/components/common/RippleRings";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

export type TideLevel = "normal" | "watch" | "warning";

type TideBannerProps = {
  level: TideLevel;
  message: string;
};

const LEVEL_LABEL: Record<TideLevel, string> = {
  normal: "Normal",
  watch: "Watch",
  warning: "Warning",
};

function getLevelStyles(
  COLORS: ColorPalette,
): Record<TideLevel, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> {
  return {
    normal: { bg: COLORS.successBg, fg: COLORS.success, icon: "checkmark" },
    watch: { bg: COLORS.warningBg, fg: COLORS.warning, icon: "alert" },
    warning: { bg: COLORS.primaryTint, fg: COLORS.danger, icon: "warning" },
  };
}

export default function TideBanner({ level, message }: TideBannerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { bg, fg, icon } = getLevelStyles(COLORS)[level];

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <View style={styles.iconWrap}>
        <RippleRings
          size={30}
          ringCount={2}
          color={`${fg}26`}
          style={styles.ripple}
        />
        <View style={[styles.iconCircle, { backgroundColor: fg }]}>
          <Ionicons name={icon} size={12} color={COLORS.white} />
        </View>
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: fg }]}>
          Tide Level: {LEVEL_LABEL[level]}
        </Text>
        <Text style={[styles.message, { color: fg }]}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row",
      gap: SPACING.sm,
      borderRadius: RADIUS.lg,
      padding: SPACING.sm + 2,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      ...SHADOW,
    },
    iconWrap: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    ripple: {
      position: "absolute",
    },
    iconCircle: {
      width: 20,
      height: 20,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.caption,
    },
    message: {
      fontSize: TYPOGRAPHY.small,
      opacity: 0.85,
      marginTop: 2,
    },
  });
}
