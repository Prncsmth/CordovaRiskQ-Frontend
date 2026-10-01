// components/responder/incident-detail/SlideToResolve.tsx
// Replaces the old tap-button + confirmation-dialog pair for marking an
// incident resolved: the slide gesture itself is the deliberate
// confirmation (same reasoning as SOSButton's slide-to-send), so there's
// no second "Are you sure?" popup after it completes. Mirrors SOSButton's
// Pan-gesture mechanics, but green/success-colored, and slide-only (no
// plain-tap shortcut) -- resolving an incident is a deliberate act, not an
// emergency where a faster tap-first path matters the way SOS's does.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW_LG, TYPOGRAPHY, type ColorPalette } from "@/theme";

const THUMB_SIZE = 52;
const TRACK_PADDING = 4;
const COMPLETE_THRESHOLD = 0.7;

export default function SlideToResolve({ onComplete }: { onComplete: () => void }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const maxTranslate = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);

  function handleTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  function handleComplete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.min(Math.max(0, event.translationX), maxTranslate);
    })
    .onEnd(() => {
      if (maxTranslate > 0 && translateX.value > maxTranslate * COMPLETE_THRESHOLD) {
        translateX.value = withSequence(
          withTiming(maxTranslate, { duration: 120 }, (finished) => {
            if (finished) runOnJS(handleComplete)();
          }),
          withDelay(400, withSpring(0)),
        );
      } else {
        translateX.value = withSpring(0);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: THUMB_SIZE + translateX.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, maxTranslate * 0.6], [1, 0], "clamp"),
  }));

  return (
    <View style={styles.wrap}>
      <View
        style={styles.track}
        onLayout={handleTrackLayout}
        accessibilityRole="button"
        accessibilityLabel="Mark incident resolved"
        accessibilityHint="Slide the handle to the right to mark this incident resolved."
        // Lets a screen reader's own "activate" gesture (e.g. VoiceOver/
        // TalkBack double-tap on a focused element) trigger the same
        // completion a physical slide does, without adding a plain-tap
        // shortcut for sighted/regular touch -- a deliberate assistive-tech
        // affordance, not a bypass of the slide requirement.
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "activate") handleComplete();
        }}
      >
        <Animated.View style={[styles.fill, fillStyle]} />

        <Animated.Text style={[styles.label, labelStyle]}>
          Slide to Mark Resolved
        </Animated.Text>

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.thumb, thumbStyle]}>
            <Ionicons name="checkmark" size={22} color={COLORS.success} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      borderRadius: RADIUS.full,
      marginTop: 12,
      ...SHADOW_LG,
      shadowColor: COLORS.success,
      shadowOpacity: 0.3,
    },
    track: {
      height: THUMB_SIZE + TRACK_PADDING * 2,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.success,
      padding: TRACK_PADDING,
      justifyContent: "center",
      overflow: "hidden",
    },
    fill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.14)",
      borderRadius: RADIUS.full,
    },
    label: {
      position: "absolute",
      alignSelf: "center",
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.white,
      letterSpacing: 0.3,
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.white,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
