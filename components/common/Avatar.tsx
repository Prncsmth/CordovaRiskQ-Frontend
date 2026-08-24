import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import { useThemeColors, RADIUS, TYPOGRAPHY, type ColorPalette } from "@/theme";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({ name }: { name: string }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatar}
    >
      <Text style={styles.text}>{getInitials(name)}</Text>
    </LinearGradient>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    avatar: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.full,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: COLORS.primary,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    text: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.subtitle,
    },
  });
}
