// components/common/BackButton.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
    StyleProp,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
} from "react-native";

import { useThemeColors, RADIUS, SHADOW, type ColorPalette } from "@/theme";

interface BackButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function BackButton({ onPress, style }: BackButtonProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="chevron-back" size={18} color={COLORS.text} />
    </TouchableOpacity>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    button: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      alignItems: "center",
      justifyContent: "center",
      ...SHADOW,
    },
  });
}
