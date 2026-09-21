// components/map/NearestCenterButton.tsx
// Floating toggle: when active, the map screen hides every evacuation
// center marker except the one closest to the citizen, so it's the one
// thing left to look at instead of picking it out from the full list.
// Forwards its ref so MapFirstTimeGuide can measure it as a tour target.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { RADIUS, SHADOW_LG, SPACING, useThemeColors, type ColorPalette } from "@/theme";

export default React.forwardRef<View, {
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}>(function NearestCenterButton({ active, disabled = false, onPress, style }, ref) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <Pressable
      ref={ref}
      collapsable={false}
      onPress={onPress}
      disabled={disabled}
      style={[styles.outer, disabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={
        active
          ? "Show all evacuation centers"
          : "Show only the nearest evacuation center"
      }
    >
      {active ? (
        <View style={styles.buttonActive}>
          <Ionicons name="flag" size={20} color={COLORS.white} />
        </View>
      ) : (
        <View style={styles.button}>
          <Ionicons name="flag-outline" size={20} color={COLORS.primary} />
        </View>
      )}
    </Pressable>
  );
});

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    outer: {
      position: "absolute",
      right: SPACING.md,
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      overflow: "hidden",
      ...SHADOW_LG,
    },
    disabled: {
      opacity: 0.5,
    },
    button: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
    },
    buttonActive: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primary,
    },
  });
}
