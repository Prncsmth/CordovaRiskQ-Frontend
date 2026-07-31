import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

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
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  input: {
    height: 52,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
});
