// components/tour/TourTooltip.tsx
// The explanation card for the first-time guide -- anchored right next to
// the current step's highlighted feature (above it, or below it, based on
// available screen space), not fixed to one spot on screen. A small notch
// on the card's near edge points at the feature directly; there's no
// separate cursor/hand element anymore -- the card's own position and
// notch are what tie it to the right part of the screen. Deliberately a
// fixed light card regardless of the app's own theme (white background,
// its own palette below) -- same reasoning as the app's other "must read
// consistently" fixed-color surfaces (the map's user-location blue, the
// notification icon palette): a short-lived onboarding overlay, not a
// themed app surface.
//
// Presentation only -- step flow, targeting, and persistence all live in
// TourContext/FirstTimeGuideOverlay and are untouched by this component.
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { TourStepConfig } from "@/context/TourContext";
import type { Rect } from "./types";

const CARD_WHITE = "#FFFFFF";
const TITLE_COLOR = "#111827";
const BODY_COLOR = "#6B7280";
const PRIMARY_RED = "#C8102E";
const SECONDARY_GRAY = "#6B7280";
const HANDLE_GRAY = "#E5E7EB";
const NOTCH_SIZE = 20;
const CARD_SIDE_MARGIN = 16;
const CARD_PADDING_H = 22;
const TARGET_GAP = 16;
// Keeps the notch from sitting right in a rounded corner when the target
// is near a screen edge.
const NOTCH_EDGE_PADDING = 20;
// Rough estimate of the card's own rendered height, used only to keep a
// top-anchored card from being clamped so low it would overflow the
// bottom edge. Approximate on purpose -- measuring the card's real height
// would need its own onLayout + a second render pass, not worth it for a
// safety clamp.
const ESTIMATED_CARD_HEIGHT = 230;

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
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Points at the actual target's horizontal center, not the card's own
  // center -- clamped so it never sits inside a rounded corner when the
  // target is near a screen edge.
  const cardWidth = screenWidth - CARD_SIDE_MARGIN * 2;
  const notchLeft = targetRect
    ? Math.min(
        Math.max(
          targetRect.x + targetRect.width / 2 - CARD_SIDE_MARGIN - NOTCH_SIZE / 2,
          NOTCH_EDGE_PADDING,
        ),
        cardWidth - NOTCH_SIZE - NOTCH_EDGE_PADDING,
      )
    : 0;

  // Safe viewport the card is allowed to render in -- keeps it clear of the
  // status bar above and the bottom tab bar / home indicator below, even
  // for a target measured near a screen edge.
  const topSafeBound = insets.top + CARD_SIDE_MARGIN;
  const bottomSafeBound = insets.bottom + CARD_SIDE_MARGIN;

  // True when the target sits in the lower half of the screen -- the card
  // then renders ABOVE it (anchored via `bottom`), with its notch on the
  // card's own bottom edge pointing down at the target. False renders the
  // card BELOW the target (anchored via `top`), notch on the card's top
  // edge pointing up. No target (the step-0 welcome card) falls back to a
  // roughly centered position with no notch at all.
  const targetIsBelowCard = targetRect ? targetRect.y > screenHeight / 2 : false;

  const positionStyle = targetRect
    ? targetIsBelowCard
      ? {
          bottom: Math.max(
            screenHeight - targetRect.y + TARGET_GAP,
            bottomSafeBound,
          ),
        }
      : {
          top: Math.min(
            Math.max(targetRect.y + targetRect.height + TARGET_GAP, topSafeBound),
            screenHeight - bottomSafeBound - ESTIMATED_CARD_HEIGHT,
          ),
        }
    : { top: "40%" as const };

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 16;
    opacity.value = withTiming(1, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });
  }, [stepIndex, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  function handlePress(action: () => void) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  }

  return (
    <Animated.View style={[styles.wrap, positionStyle, animatedStyle]}>
      {/* Points at the highlighted feature -- from the card's bottom edge
          when the card sits above it, or the top edge when the card sits
          below it. Hidden on the no-target welcome step. */}
      {targetRect ? (
        <View
          style={[
            styles.notch,
            targetIsBelowCard ? styles.notchAtBottom : styles.notchAtTop,
            { left: notchLeft },
          ]}
        />
      ) : null}

      <View style={styles.handle} />

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
          <Text style={styles.nextButtonText}>
            {isLastStep ? "Finish" : "Next"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: CARD_SIDE_MARGIN,
    right: CARD_SIDE_MARGIN,
    backgroundColor: CARD_WHITE,
    borderRadius: 24,
    paddingHorizontal: CARD_PADDING_H,
    paddingTop: 14,
    paddingBottom: 22,
    // Subtle elevation only -- no heavy shadow, no gradient, no glass.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  notch: {
    position: "absolute",
    width: NOTCH_SIZE,
    height: NOTCH_SIZE,
    borderRadius: 6,
    backgroundColor: CARD_WHITE,
    transform: [{ rotate: "45deg" }],
  },
  notchAtTop: {
    top: -NOTCH_SIZE / 2,
  },
  notchAtBottom: {
    bottom: -NOTCH_SIZE / 2,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: HANDLE_GRAY,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: SECONDARY_GRAY,
  },
  title: {
    fontSize: 19,
    fontWeight: "600",
    color: TITLE_COLOR,
    marginTop: 10,
  },
  body: {
    fontSize: 14.5,
    fontWeight: "400",
    color: BODY_COLOR,
    lineHeight: 21,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: SECONDARY_GRAY,
  },
  backSpacer: {
    width: 10,
  },
  nextButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_RED,
  },
  nextButtonText: {
    color: CARD_WHITE,
    fontWeight: "700",
    fontSize: 15.5,
  },
});
