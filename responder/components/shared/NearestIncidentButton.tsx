// responder/components/shared/NearestIncidentButton.tsx
// Floating toggle for the responder's Live Map: when active, hides every
// incident/SOS marker except the closest one to the responder, so it's the
// one thing left to look at instead of picking it out from a busy map --
// same pattern as the citizen map's NearestCenterButton for evacuation
// centers.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { RADIUS, SHADOW_LG, useThemeColors, type ColorPalette } from "@/theme";

export default function NearestIncidentButton({
  active,
  disabled = false,
  onPress,
  style,
}: {
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.outer, disabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={
        active ? "Show all incidents" : "Show only the nearest incident or SOS"
      }
    >
      {active ? (
        <View style={styles.buttonActive}>
          <Ionicons name="navigate" size={20} color={COLORS.white} />
        </View>
      ) : (
        <View style={styles.button}>
          <Ionicons name="navigate-outline" size={20} color={COLORS.primary} />
        </View>
      )}
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    outer: {
      width: 36,
      height: 36,
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
      backgroundColor: COLORS.background,
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
