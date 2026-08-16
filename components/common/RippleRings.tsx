// components/common/RippleRings.tsx
// RiskQ's signature motif: concentric rings evoking a tide/sonar ripple.
// Built from plain Views (no react-native-svg) so it stays a JS-only change.
// Used animated for the SOS active state, and static (as a small badge or a
// faint background watermark) elsewhere.
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type RippleRingsProps = {
  size?: number;
  color?: string;
  ringCount?: number;
  animated?: boolean;
  style?: object;
};

export default function RippleRings({
  size = 120,
  color = "rgba(255, 255, 255, 0.35)",
  ringCount = 2,
  animated = false,
  style,
}: RippleRingsProps) {
  const rings = Array.from({ length: ringCount }, (_, i) => i);

  return (
    <View style={[{ width: size, height: size }, styles.wrap, style]}>
      {rings.map((i) =>
        animated ? (
          <AnimatedRing
            key={i}
            size={size}
            color={color}
            delay={i * 550}
          />
        ) : (
          <View
            key={i}
            style={[
              styles.ring,
              {
                width: size * (1 - i * 0.22),
                height: size * (1 - i * 0.22),
                borderRadius: (size * (1 - i * 0.22)) / 2,
                backgroundColor: color,
              },
            ]}
          />
        ),
      )}
    </View>
  );
}

function AnimatedRing({
  size,
  color,
  delay,
}: {
  size: number;
  color: string;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.7, { duration: 1600, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    // Animation loops via withRepeat; this only needs to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
  },
});
