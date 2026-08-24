import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { useThemeColors, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type ProfileFieldInputProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
} & Pick<
  TextInputProps,
  "keyboardType" | "autoCapitalize" | "secureTextEntry" | "placeholder"
>;

export default function ProfileFieldInput({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  placeholder,
}: ProfileFieldInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, isFocused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      gap: SPACING.xs,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginLeft: SPACING.xs,
    },
    input: {
      height: 52,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      borderColor: COLORS.borderMuted,
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.md,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      ...SHADOW,
    },
    inputFocused: {
      borderColor: COLORS.primary,
    },
  });
}
