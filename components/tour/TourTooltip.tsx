// components/tour/TourTooltip.tsx
// The tooltip card for the first-time guide: title, body copy, a dot
// progress row, and Skip/Back/Next/Finish. Positions itself above or
// below the current target (or roughly centered when there's no target,
// i.e. step 0) based on available screen space.
import React, { useEffect, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { TourStepConfig } from "@/context/TourContext";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Rect } from "./types";

const TARGET_GAP = SPACING.md;

type TourTooltipProps = {
  step: TourStepConfig;
  stepIndex: number;
  totalSteps: number;
  targetRect: Rect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
};

export default function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: TourTooltipProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { height: screenHeight } = useWindowDimensions();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 12;
    opacity.value = withTiming(1, { duration: 220 });
    translateY.value = withTiming(0, { duration: 220 });
  }, [stepIndex, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  const positionStyle = targetRect
    ? targetRect.y > screenHeight / 2
      ? { bottom: screenHeight - targetRect.y + TARGET_GAP }
      : { top: targetRect.y + targetRect.height + TARGET_GAP }
    : { top: "40%" as const };

  function handlePress(action: () => void) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  }

  return (
    <Animated.View style={[styles.wrap, positionStyle, animatedStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>
        <Pressable onPress={() => handlePress(onSkip)} hitSlop={8}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Text style={styles.stepLabel}>
        Step {stepIndex + 1} of {totalSteps}
      </Text>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.body}</Text>

      <View style={styles.actionsRow}>
        {!isFirstStep ? (
          <Pressable style={styles.backButton} onPress={() => handlePress(onBack)}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <Pressable
          style={styles.nextButton}
          onPress={() => handlePress(isLastStep ? onFinish : onNext)}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>{isLastStep ? "Finish" : "Next"}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      left: SPACING.lg,
      right: SPACING.lg,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      ...SHADOW_LG,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressRow: {
      flexDirection: "row",
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
    },
    dotActive: {
      backgroundColor: COLORS.primary,
      width: 16,
    },
    skipText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    stepLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.primary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: SPACING.md,
    },
    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
      marginTop: SPACING.xs,
    },
    body: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      lineHeight: 21,
      marginTop: SPACING.xs,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      marginTop: SPACING.lg,
    },
    backButton: {
      paddingVertical: SPACING.sm + 4,
      paddingHorizontal: SPACING.md,
    },
    backButtonText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    backSpacer: {
      width: SPACING.sm,
    },
    nextButton: {
      flex: 1,
      borderRadius: RADIUS.md,
      overflow: "hidden",
    },
    nextButtonGradient: {
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    nextButtonText: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.body,
    },
  });
}
