// components/faqs/FaqRow.tsx
// Expandable question/answer row used by the FAQs screen's question list.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const BULLET_SIZE = 7;
const QUESTION_LINE_HEIGHT = 24;

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
  // The chevron turns from pointing down (closed) to up (open).
  const rotation = useSharedValue(isOpen ? 180 : 0);
  useEffect(() => {
    rotation.value = withTiming(isOpen ? 180 : 0, { duration: 200 });
  }, [isOpen, rotation]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
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
          <View style={styles.bullet} />
          <Text style={styles.question}>{faq.question}</Text>
          <Animated.View style={[styles.chevron, chevronStyle]}>
            <Ionicons
              name="chevron-down"
              size={18}
              color={isOpen ? COLORS.primary : COLORS.textTertiary}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
      {isOpen && <Text style={styles.answer}>{faq.answer}</Text>}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    // Top-aligned, so on a two-line question the bullet and chevron sit
    // beside the first line rather than floating in the middle.
    questionRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACING.sm,
      minHeight: 64,
      paddingVertical: SPACING.md + 2,
    },
    // One brand-red bullet for every question.
    bullet: {
      backgroundColor: COLORS.primary,
      width: BULLET_SIZE,
      height: BULLET_SIZE,
      borderRadius: BULLET_SIZE / 2,
      // Centered on the question's first line (lineHeight 24).
      marginTop: (QUESTION_LINE_HEIGHT - BULLET_SIZE) / 2,
    },
    chevron: {
      marginTop: (QUESTION_LINE_HEIGHT - 18) / 2,
    },
    question: {
      flex: 1,
      color: COLORS.text,
      fontSize: TYPOGRAPHY.body,
      lineHeight: QUESTION_LINE_HEIGHT,
      fontWeight: "700",
    },
    answer: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption,
      lineHeight: 22,
      // Lines the answer up under the question text, past the bullet.
      paddingLeft: BULLET_SIZE + SPACING.sm,
      paddingBottom: SPACING.md,
      paddingRight: SPACING.lg,
    },
  });
}
