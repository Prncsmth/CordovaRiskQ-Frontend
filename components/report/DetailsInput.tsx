import React from "react";
import { StyleSheet, TextInput } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type DetailsInputProps = {
  value: string;
  onChangeText: (text: string) => void;
};

export default function DetailsInput({ value, onChangeText }: DetailsInputProps) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder="Describe what's happening..."
      placeholderTextColor={COLORS.textTertiary}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 100,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
});
