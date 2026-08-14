import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/theme";

const MAX_LENGTH = 500;

type DetailsInputProps = {
  value: string;
  onChangeText: (text: string) => void;
};

export default function DetailsInput({ value, onChangeText }: DetailsInputProps) {
  return (
    <View style={styles.wrap}>
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
      />
      <Text style={styles.counter}>
        {value.length}/{MAX_LENGTH}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    ...SHADOW,
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
