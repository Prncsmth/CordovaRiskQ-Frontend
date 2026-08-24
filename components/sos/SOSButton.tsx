import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onPress?.();
            }}
            onPressIn={() => {
              scale.value = withTiming(0.96, { duration: 100 });
            }}
            onPressOut={() => {
              scale.value = withTiming(1, { duration: 100 });
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fill}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.7 }}
                style={styles.sheen}
              />
              <Text style={styles.text}>SOS</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
      <Text style={styles.caption}>Tap to alert emergency responders</Text>
    </View>
  );
}

const BUTTON_SIZE = 150;
const GLOW_SIZE = 174;

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
    ...SHADOW_LG,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
  },
  pressable: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
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
