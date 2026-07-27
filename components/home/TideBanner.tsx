import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export type TideLevel = "normal" | "watch" | "warning";

type TideBannerProps = {
  level: TideLevel;
  message: string;
};

const LEVEL_STYLES: Record<
  TideLevel,
  { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  normal: { bg: COLORS.successBg, fg: COLORS.success, icon: "checkmark" },
  watch: { bg: COLORS.warningBg, fg: COLORS.warning, icon: "alert" },
  warning: { bg: COLORS.primaryTint, fg: COLORS.danger, icon: "warning" },
};

const LEVEL_LABEL: Record<TideLevel, string> = {
  normal: "Normal",
  watch: "Watch",
  warning: "Warning",
};

export default function TideBanner({ level, message }: TideBannerProps) {
  const { bg, fg, icon } = LEVEL_STYLES[level];

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <View style={[styles.iconCircle, { backgroundColor: fg }]}>
        <Ionicons name={icon} size={12} color={COLORS.white} />
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

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
  },
  message: {
    fontSize: TYPOGRAPHY.small,
    opacity: 0.85,
    marginTop: 2,
  },
});
