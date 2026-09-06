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
          <View
            style={[
              styles.categoryDot,
              faq.category === "Safety" && styles.safetyDot,
            ]}
          />
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
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.tide,
    },
    safetyDot: { backgroundColor: COLORS.primary },
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
