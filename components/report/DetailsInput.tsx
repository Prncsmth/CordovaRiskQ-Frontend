import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const MAX_LENGTH = 500;

type DetailsInputProps = {
  value: string;
  onChangeText: (text: string) => void;
};

export default function DetailsInput({ value, onChangeText }: DetailsInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.wrap, isFocused && styles.wrapFocused]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Describe what's happening..."
        placeholderTextColor={COLORS.textTertiary}
        multiline
        numberOfLines={4}
        maxLength={MAX_LENGTH}
        textAlignVertical="top"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <Text style={styles.counter}>
        {value.length}/{MAX_LENGTH}
      </Text>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderMuted,
    padding: SPACING.sm,
    ...SHADOW,
  },
  wrapFocused: {
    borderColor: COLORS.primary,
  },
  input: {
    minHeight: 100,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    padding: SPACING.xs,
  },
  counter: {
    alignSelf: "flex-end",
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    paddingHorizontal: SPACING.xs,
  },
  });
}
