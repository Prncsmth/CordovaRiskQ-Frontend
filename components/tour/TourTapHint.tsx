// components/tour/TourTapHint.tsx
// Realistic "tap here" indicator for the first-time guide -- replaces the
// old generic up/down arrow icon (components/tour/TourTooltip.tsx), which
// only pointed loosely toward the target from the tooltip card's edge.
// This renders directly at the spotlighted target's edge (not its full
// center, so it never sits on top of a label/icon caption underneath it):
// a hand icon with its fingertip touching the target, plus a looping tap
// ripple, the way real mobile app onboarding tutorials (Grab, Foodpanda,
// etc.) demonstrate where to tap -- not a generic presentation arrow. The
// hand's approach direction (pointing down vs. up) mirrors which side of
// the target the tooltip card renders on (see TourTooltip's own
// above/below logic), so it always reads as "coming from the card, into
// the target" instead of a fixed orientation regardless of position.
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors } from "@/theme";
import type { Rect } from "./types";

const RIPPLE_SIZE = 38;
const HAND_SIZE = 30;
// How far the fingertip sits inside the target's edge rather than exactly
// on it -- purely a hair of visual overlap so the tip reads as "touching"
// instead of floating just outside the spotlighted cutout.
const EDGE_OVERLAP = 4;

type TourTapHintProps = {
  targetRect: Rect | null;
};

export default function TourTapHint({ targetRect }: TourTapHintProps) {
  const COLORS = useThemeColors();
  const { height: screenHeight } = useWindowDimensions();
  const ripple = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!targetRect) return;
    ripple.value = 0;
    ripple.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 340 }),
      ),
      -1,
      false,
    );
  }, [targetRect, ripple, bob]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - ripple.value),
    transform: [{ scale: 0.6 + ripple.value * 0.9 }],
  }));

  // Same threshold TourTooltip uses to decide whether the card renders
  // above or below the target -- keeping the hand's approach direction in
  // sync with the card it "comes from" instead of a fixed orientation.
  // Meaningless while targetRect is null (nothing renders below in that
  // case), but computed unconditionally so the useAnimatedStyle call right
  // after it isn't skipped on some renders and not others.
  const targetInLowerHalf = targetRect ? targetRect.y > screenHeight / 2 : false;

  // Small repeated nudge toward the target, in the same direction the hand
  // is already pointing -- reads as a light, repeated tap rather than a
  // static icon just sitting there.
  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * (targetInLowerHalf ? 5 : -5) }],
  }));

  if (!targetRect) return null;

  // Card above target (target in lower half) -> hand descends from above,
  // fingertip lands on the target's TOP edge. Card below target -> hand
  // rises from below, fingertip lands on the BOTTOM edge. Anchoring to an
  // edge instead of the full vertical center keeps the hand clear of a
  // label/caption that sits inside the opposite half of the target (e.g.
  // an icon-above-label card).
  const touchX = targetRect.x + targetRect.width / 2;
  const touchY = targetInLowerHalf
    ? targetRect.y + EDGE_OVERLAP
    : targetRect.y + targetRect.height - EDGE_OVERLAP;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.ripple,
          { borderColor: COLORS.white, left: touchX - RIPPLE_SIZE / 2, top: touchY - RIPPLE_SIZE / 2 },
          rippleStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.hand,
          targetInLowerHalf
            ? { left: touchX - HAND_SIZE / 2, top: touchY }
            : { left: touchX - HAND_SIZE / 2, top: touchY - HAND_SIZE },
          handStyle,
        ]}
      >
        <MaterialCommunityIcons
          name={targetInLowerHalf ? "hand-pointing-down" : "hand-pointing-up"}
          size={HAND_SIZE}
          color={COLORS.white}
          style={styles.handIcon}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ripple: {
    position: "absolute",
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
    borderWidth: 2,
    zIndex: 3,
  },
  hand: {
    position: "absolute",
    width: HAND_SIZE,
    height: HAND_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
  },
  handIcon: {
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
