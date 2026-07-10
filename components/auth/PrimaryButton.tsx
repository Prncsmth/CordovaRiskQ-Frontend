import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";

import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme";

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export default function PrimaryButton({
  title,
  loading = false,
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.disabled, style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 56,

    backgroundColor: COLORS.primary,

    borderRadius: RADIUS.md,

    alignItems: "center",
    justifyContent: "center",

    marginTop: SPACING.sm,
  },

  disabled: {
    opacity: 0.6,
  },

  text: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
  },
});
