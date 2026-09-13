import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { DETAIL_SUGGESTIONS, type CategoryId } from "@/components/report/categories";
import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const MAX_LENGTH = 500;

type DetailsInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  category: CategoryId | null;
};

export default function DetailsInput({ value, onChangeText, category }: DetailsInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const suggestions = category ? DETAIL_SUGGESTIONS[category] : [];

  function applySuggestion(phrase: string) {
    onChangeText(value.trim().length > 0 ? `${value.trim()}. ${phrase}` : phrase);
  }

  return (
    <View style={[styles.wrap, isFocused && styles.wrapFocused]}>
      {suggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionRow}
        >
          {suggestions.map((phrase) => (
            <Pressable
              key={phrase}
              style={styles.suggestionChip}
              onPress={() => applySuggestion(phrase)}
            >
              <Text style={styles.suggestionText}>{phrase}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

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
  suggestionRow: {
    gap: SPACING.xs,
    paddingRight: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  suggestionChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
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
