// components/map/PinButton.tsx
// Floating toggle for pin-drop mode on the map screen. Forwards its ref
// so MapFirstTimeGuide can measure it as a tour target.
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { RADIUS, SHADOW_LG, SPACING, useThemeColors, type ColorPalette } from "@/theme";

export default React.forwardRef<View, {
  active: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}>(function PinButton({ active, loading = false, disabled = false, onPress, style }, ref) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <Pressable
      ref={ref}
      collapsable={false}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.pinButtonOuter, (disabled || loading) && styles.pinButtonDisabled, style]}
      accessibilityLabel={active ? "Cancel pinning emergency location" : "Pin emergency location"}
    >
      {loading ? (
        <BlurView intensity={60} tint={COLORS.glassTint} style={styles.pinButton}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </BlurView>
      ) : active ? (
        <View style={styles.pinButtonActive}>
          <Ionicons name="location" size={22} color={COLORS.white} />
        </View>
      ) : (
        <BlurView intensity={60} tint={COLORS.glassTint} style={styles.pinButton}>
          <Ionicons name="location-outline" size={22} color={COLORS.primary} />
        </BlurView>
      )}
    </Pressable>
  );
});

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    pinButtonOuter: {
      position: "absolute",
      right: SPACING.md,
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      overflow: "hidden",
      ...SHADOW_LG,
    },
    pinButtonDisabled: {
      opacity: 0.5,
    },
    pinButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.glassOverlay,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    pinButtonActive: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primary,
    },
  });
}
