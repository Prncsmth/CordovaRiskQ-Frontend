// components/map/LocateButton.tsx
// Floating "center on my location" button on the map screen. Forwards
// its ref so MapFirstTimeGuide can measure it as a tour target.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { RADIUS, SHADOW_LG, SPACING, useThemeColors, type ColorPalette } from "@/theme";

export default React.forwardRef<View, {
  isLocating: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}>(function LocateButton({ isLocating, onPress, style }, ref) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <Pressable
      ref={ref}
      collapsable={false}
      onPress={onPress}
      disabled={isLocating}
      style={[styles.locateButtonOuter, style]}
      accessibilityLabel="Locate me"
    >
      <View style={styles.locateButton}>
        {isLocating ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons name="locate" size={22} color={COLORS.primary} />
        )}
      </View>
    </Pressable>
  );
});

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    locateButtonOuter: {
      position: "absolute",
      right: SPACING.md,
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      overflow: "hidden",
      ...SHADOW_LG,
    },
    locateButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
    },
  });
}
