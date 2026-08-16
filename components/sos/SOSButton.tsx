import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { COLORS, FONT_FAMILY, RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY } from "@/theme";

export function SOSButton({ onPress }: { onPress?: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.glow}>
        <Animated.View style={[styles.button, animatedStyle]}>
          <Pressable
            style={styles.pressable}
            onPress={onPress}
            onPressIn={() => {
              scale.value = withTiming(0.96, { duration: 100 });
            }}
            onPressOut={() => {
              scale.value = withTiming(1, { duration: 100 });
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.text}>SOS</Text>
          </Pressable>
        </Animated.View>
      </View>
      <Text style={styles.caption}>Tap to alert emergency responders</Text>
    </View>
  );
}

const BUTTON_SIZE = 150;
const GLOW_SIZE = 170;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  glow: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    ...SHADOW_LG,
  },
  pressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: FONT_FAMILY.display,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.heading,
    letterSpacing: 1,
  },
  caption: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
});
