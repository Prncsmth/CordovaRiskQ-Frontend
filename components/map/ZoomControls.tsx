// components/map/ZoomControls.tsx
// Floating zoom in/out control stack on the map screen.
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { RADIUS, SHADOW_LG, SPACING, useThemeColors, type ColorPalette } from "@/theme";

export default function ZoomControls({
  zoomLevel,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut,
  style,
}: {
  zoomLevel: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.zoomControls, style]}>
      <BlurView intensity={60} tint={COLORS.glassTint} style={styles.zoomBlur}>
        <Pressable
          onPress={onZoomIn}
          disabled={zoomLevel >= maxZoom}
          style={styles.zoomButton}
          accessibilityLabel="Zoom in"
        >
          <Ionicons
            name="add"
            size={20}
            color={zoomLevel >= maxZoom ? COLORS.textTertiary : COLORS.text}
          />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          onPress={onZoomOut}
          disabled={zoomLevel <= minZoom}
          style={styles.zoomButton}
          accessibilityLabel="Zoom out"
        >
          <Ionicons
            name="remove"
            size={20}
            color={zoomLevel <= minZoom ? COLORS.textTertiary : COLORS.text}
          />
        </Pressable>
      </BlurView>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    zoomControls: {
      position: "absolute",
      right: SPACING.md,
      width: 44,
      borderRadius: RADIUS.md,
      overflow: "hidden",
      ...SHADOW_LG,
    },
    zoomBlur: {
      backgroundColor: COLORS.glassOverlay,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    zoomButton: {
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    zoomDivider: {
      height: 1,
      backgroundColor: COLORS.border,
    },
  });
}
