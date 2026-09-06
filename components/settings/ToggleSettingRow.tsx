// components/settings/ToggleSettingRow.tsx
// Icon + label + switch row used by the Settings screen's Preferences
// section.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export type ToggleRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export default function ToggleSettingRow({ row }: { row: ToggleRow }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={COLORS.iconTileGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconCircle}
      >
        <Ionicons name={row.icon} size={18} color={COLORS.primary} />
      </LinearGradient>
      <View style={styles.textCol}>
        <Text style={styles.label}>{row.label}</Text>
        <Text style={styles.description}>{row.description}</Text>
      </View>
      <Switch
        value={row.value}
        onValueChange={(value) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          row.onValueChange(value);
        }}
        trackColor={{ true: COLORS.primary }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingVertical: SPACING.sm + 4,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    description: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
  });
}
