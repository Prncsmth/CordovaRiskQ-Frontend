import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type Variant = "primary" | "secondary" | "success" | "danger";

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: COLORS.primary, text: COLORS.white },
  secondary: { bg: COLORS.surface, text: COLORS.text, border: COLORS.border },
  success: { bg: COLORS.success, text: COLORS.white },
  danger: { bg: COLORS.danger, text: COLORS.white },
};

export default function RButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const { bg, text, border } = VARIANT_STYLES[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: border ?? "transparent",
          borderWidth: border ? 1 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={text} style={styles.icon} />}
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
  },
});
