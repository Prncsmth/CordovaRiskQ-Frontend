import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, RADIUS, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";
import { getPasswordRequirements } from "@/utils/passwordPolicy";

const SEGMENTS = 3;

// Sourced from the same requirement list the checklist below shows, so the
// two never disagree about what's actually been met.
function getStrength(
  password: string,
  COLORS: ColorPalette,
): { score: number; label: string; color: string; icon: keyof typeof Ionicons.glyphMap } {
  const score = getPasswordRequirements(password).filter((requirement) => requirement.met).length;

  if (score <= 2) return { score: 1, label: "Weak", color: COLORS.danger, icon: "shield-outline" };
  if (score <= 4) return { score: 2, label: "Fair", color: COLORS.warning, icon: "shield-half-outline" };
  return { score: 3, label: "Strong", color: COLORS.success, icon: "shield-checkmark" };
}

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (!password) return null;

  const { score, label, color, icon } = getStrength(password, COLORS);

  return (
    <View style={styles.wrapper}>
      <Ionicons name={icon} size={15} color={color} />
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
    },
    track: {
      flex: 1,
      flexDirection: "row",
      gap: 4,
    },
    segment: {
      flex: 1,
      height: 5,
      borderRadius: RADIUS.full,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      minWidth: 44,
    },
  });
}
