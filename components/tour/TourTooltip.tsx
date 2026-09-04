// components/tour/TourTooltip.tsx
// The tooltip card for the first-time guide: title, body copy, a dot
// progress row, and Skip/Back/Next/Finish. Positions itself above or
// below the current target (or roughly centered when there's no target,
// i.e. step 0) based on available screen space.
// The tooltip card for the first-time guide: title, body copy, and
// Skip/Back/Next/Finish. Positions itself above or below the current target
// (or roughly centered when there's no target, i.e. step 0).
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
// Rough estimate of the card's own rendered height, used only to keep a
// top-anchored card from being clamped so low it would overflow the
// bottom edge. Approximate on purpose -- measuring the card's real height
// would need its own onLayout + a second render pass, not worth it for a
// safety clamp.
const ESTIMATED_CARD_HEIGHT = 220;

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
  const insets = useSafeAreaInsets();

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

  // Safe viewport the card is allowed to render in -- keeps it clear of the
  // status bar above and the bottom tab bar / home indicator below, even
  // for a target measured near a screen edge.
  const topSafeBound = insets.top + SPACING.md;
  const bottomSafeBound = insets.bottom + SPACING.md;

  const positionStyle = targetRect
    ? targetRect.y > screenHeight / 2
      ? {
          bottom: Math.max(
            screenHeight - targetRect.y + TARGET_GAP,
            bottomSafeBound,
          ),
        }
      : {
          top: Math.min(
            Math.max(
              targetRect.y + targetRect.height + TARGET_GAP,
              topSafeBound,
            ),
            screenHeight - bottomSafeBound - ESTIMATED_CARD_HEIGHT,
          ),
        }
    : { top: "40%" as const };
  const targetIsBelowTooltip = Boolean(
    targetRect && targetRect.y > screenHeight / 2,
  );
  const arrowLeft = targetRect
    ? targetRect.x + targetRect.width / 2 - SPACING.lg - 14
    : undefined;

  function handlePress(action: () => void) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  }

  return (
    <Animated.View style={[styles.wrap, positionStyle, animatedStyle]}>
      {targetRect ? (
        <Ionicons
          name={targetIsBelowTooltip ? "arrow-down" : "arrow-up"}
          size={28}
          color={COLORS.background}
          style={[
            styles.targetArrow,
            targetIsBelowTooltip ? styles.arrowBelow : styles.arrowAbove,
            { left: arrowLeft },
          ]}
        />
      ) : null}
      <View style={styles.headerRow}>
        <Pressable onPress={() => handlePress(onSkip)} hitSlop={8}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.body}</Text>

      <View style={styles.actionsRow}>
        {!isFirstStep ? (
          <Pressable
            style={styles.backButton}
            onPress={() => handlePress(onBack)}
          >
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
            <Text style={styles.nextButtonText}>
              {isLastStep ? "Finish" : "Next"}
            </Text>
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
    skipText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    targetArrow: {
      position: "absolute",
      zIndex: 2,
    },
    arrowBelow: {
      top: "100%",
    },
    arrowAbove: {
      top: -24,
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
