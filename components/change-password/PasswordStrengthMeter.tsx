import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, RADIUS, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

const SEGMENTS = 3;

function getStrength(
  password: string,
  COLORS: ColorPalette,
): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: COLORS.danger };
  if (score <= 2) return { score: 2, label: "Fair", color: COLORS.warning };
  return { score: 3, label: "Strong", color: COLORS.success };
}

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (!password) return null;

  const { score, label, color } = getStrength(password, COLORS);

  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < score ? color : COLORS.borderMuted },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      marginLeft: SPACING.xs,
      marginTop: -SPACING.xs / 2,
    },
    track: {
      flex: 1,
      flexDirection: "row",
      gap: 4,
    },
    segment: {
      flex: 1,
      height: 4,
      borderRadius: RADIUS.full,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      minWidth: 44,
    },
  });
}
