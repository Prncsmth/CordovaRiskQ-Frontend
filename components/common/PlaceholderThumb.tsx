// components/common/PlaceholderThumb.tsx
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, ViewStyle } from "react-native";

import { useThemeColors, RADIUS } from "@/theme";

interface PlaceholderThumbProps {
  style?: StyleProp<ViewStyle>;
}

export default function PlaceholderThumb({ style }: PlaceholderThumbProps) {
  const COLORS = useThemeColors();

  return (
    <LinearGradient
      colors={[COLORS.borderMuted, COLORS.border]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: RADIUS.lg }, style]}
    />
  );
}
