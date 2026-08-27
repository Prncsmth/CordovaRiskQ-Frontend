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

export function SOSButton({ onPress }: { onPress?: () => void }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);
  const maxTranslate = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);

  function handleTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width);
  }

  function handleComplete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onPress?.();
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
      <View style={styles.track} onLayout={handleTrackLayout}>
        <Animated.View style={[styles.fill, fillStyle]} />

        <Animated.Text style={[styles.label, labelStyle]}>
          Slide to Send SOS
        </Animated.Text>

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.thumb, thumbStyle]}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
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
      ...SHADOW_LG,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.3,
    },
    track: {
      height: THUMB_SIZE + TRACK_PADDING * 2,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
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
