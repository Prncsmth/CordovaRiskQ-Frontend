// components/faqs/FaqRow.tsx
// Expandable question/answer row used by the FAQs screen's question list.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export type Faq = {
  id: string;
  category: "Safety" | "Reports" | "Account";
  question: string;
  answer: string;
};

// A category badge (icon + color) instead of Atome's one generic coin icon
// for every row -- since our FAQs actually span distinct topics (matching
// the Safety/Reports/Account filter chips above the list), giving each its
// own glyph tells the user what a question is about at a glance, not just
// that it's "a question."
function categoryVisual(category: Faq["category"], COLORS: ColorPalette) {
  switch (category) {
    case "Safety":
      return { icon: "shield-checkmark" as const, color: COLORS.primary };
    case "Reports":
      return { icon: "document-text" as const, color: COLORS.tide };
    case "Account":
      return { icon: "person" as const, color: COLORS.warning };
  }
}

export default function FaqRow({
  faq,
  isOpen,
  onToggle,
}: {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = categoryVisual(faq.category, COLORS);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          onPressIn={() => {
            scale.value = withTiming(0.98, { duration: 100 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 100 });
          }}
          style={styles.questionRow}
        >
          <Ionicons name={visual.icon} size={19} color={visual.color} />
          <Text style={styles.question}>{faq.question}</Text>
          <Ionicons
            name={isOpen ? "remove" : "add"}
            size={18}
            color={isOpen ? COLORS.primary : COLORS.textSecondary}
          />
        </Pressable>
      </Animated.View>
      {isOpen && <Text style={styles.answer}>{faq.answer}</Text>}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    questionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      minHeight: 64,
      paddingVertical: SPACING.md + 2,
    },
    question: {
      flex: 1,
      color: COLORS.text,
      fontSize: TYPOGRAPHY.body,
      lineHeight: 24,
      fontWeight: "700",
    },
    answer: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption,
      lineHeight: 22,
      paddingLeft: 16,
      paddingBottom: SPACING.md,
      paddingRight: SPACING.lg,
    },
  });
}
