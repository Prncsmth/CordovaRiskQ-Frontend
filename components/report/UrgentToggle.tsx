import React, { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

type UrgentToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export default function UrgentToggle({ value, onValueChange }: UrgentToggleProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.wrap, value && styles.wrapActive]}>
      <View style={styles.textCol}>
        <Text style={styles.label}>Mark as urgent</Text>
        <Text style={styles.hint}>
          Responders will see this report as higher priority.
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={COLORS.white}
        accessibilityLabel="Mark as urgent"
      />
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1.5,
      borderColor: COLORS.borderMuted,
      padding: SPACING.sm,
      ...SHADOW,
    },
    wrapActive: {
      borderColor: COLORS.primary,
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.text,
    },
    hint: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
  });
}
