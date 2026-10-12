import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

type UrgentToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

// Same card treatment as the Pinned Location card above it. The whole card
// toggles, not just the switch; when on, it picks up a light red tint and
// border so the choice is obvious at a glance.
export default function UrgentToggle({ value, onValueChange }: UrgentToggleProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const toggle = (next: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(next);
  };

  return (
    <Pressable
      onPress={() => toggle(!value)}
      style={[styles.card, value && styles.cardActive]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel="Mark as urgent"
      accessibilityHint="Responders will see this report as higher priority."
    >
      <View style={[styles.iconCircle, value && styles.iconCircleActive]}>
        <Ionicons
          name={value ? "alert-circle" : "alert-circle-outline"}
          size={20}
          color={value ? COLORS.white : COLORS.primary}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label}>Mark as urgent</Text>
        <Text style={styles.hint}>Responders will see this report as higher priority.</Text>
      </View>
      <Switch
        value={value}
        onValueChange={toggle}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={COLORS.white}
        // The card itself is the accessible switch.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      ...SHADOW,
    },
    cardActive: {
      backgroundColor: COLORS.primaryTint,
      borderColor: COLORS.primary,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    iconCircleActive: {
      backgroundColor: COLORS.primary,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
    },
    hint: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
  });
}
