// components/sos/SosBubble.tsx
// Draggable replacement for the old full-width MinimizedBanner: a small
// circular chat-head-style bubble the citizen can reposition anywhere on
// screen while an SOS stays active in the background. Tap (no meaningful
// drag distance) still expands back to the full SOS screen; a real drag
// just moves it, using the same Gesture.Pan + reanimated idiom as
// SOSButton.tsx/NotificationRow.tsx elsewhere in this app.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RippleRings from "@/components/common/RippleRings";
import { RADIUS, SHADOW_LG, SPACING, useThemeColors, type ColorPalette } from "@/theme";

const BUBBLE_SIZE = 56;
const RIPPLE_SIZE = 92;
// Anything less than this total drag distance counts as a tap, not a
// reposition -- Gesture.Pan has no built-in tap/drag distinction.
const TAP_MOVE_THRESHOLD = 8;

export default function SosBubble({ onPress }: { onPress: () => void }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const minX = SPACING.sm;
  const maxX = screenWidth - RIPPLE_SIZE - SPACING.sm;
  const minY = insets.top + SPACING.sm;
  const maxY = screenHeight - insets.bottom - RIPPLE_SIZE - SPACING.sm;

  // Default spot: upper-right, roughly where the old banner used to sit --
  // a fresh SOS always starts here regardless of where a previous one was
  // left, since position isn't persisted across SOS sessions.
  const translateX = useSharedValue(maxX);
  const translateY = useSharedValue(minY);
  const startX = useSharedValue(maxX);
  const startY = useSharedValue(minY);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.min(Math.max(minX, startX.value + event.translationX), maxX);
      translateY.value = Math.min(Math.max(minY, startY.value + event.translationY), maxY);
    })
    // onEnd only fires once the gesture has activated (moved past Pan's own
    // activation threshold) -- a plain tap never crosses that, so it would
    // never reach onEnd and onPress would never fire. onFinalize fires
    // either way (recognized-and-finished, or never-activated), which is
    // what tap-vs-drag detection here actually needs.
    .onFinalize((event) => {
      const moved = Math.abs(event.translationX) + Math.abs(event.translationY);
      if (moved < TAP_MOVE_THRESHOLD) {
        runOnJS(onPress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.wrap, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel="SOS active, responders notified. Tap to view status, drag to move."
      >
        <View style={styles.rippleLayer} pointerEvents="none">
          <RippleRings size={RIPPLE_SIZE} ringCount={2} animated color="rgba(200, 16, 46, 0.35)" />
        </View>
        <View style={styles.bubble}>
          <Ionicons name="warning" size={22} color={COLORS.white} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      width: RIPPLE_SIZE,
      height: RIPPLE_SIZE,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      elevation: 100,
    },
    rippleLayer: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    bubble: {
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
      ...SHADOW_LG,
    },
  });
}
