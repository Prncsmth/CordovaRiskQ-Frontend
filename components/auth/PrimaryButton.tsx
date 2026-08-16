import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme";

interface PrimaryButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function PrimaryButton({
  title,
  loading = false,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PrimaryButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.button, (disabled || loading) && styles.disabled, style]}
        disabled={disabled || loading}
        onPressIn={(e) => {
          scale.value = withTiming(0.97, { duration: 100 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withTiming(1, { duration: 100 });
          onPressOut?.(e);
        }}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 56,

    backgroundColor: COLORS.primary,

    borderRadius: RADIUS.md,

    alignItems: "center",
    justifyContent: "center",

    marginTop: SPACING.sm,
  },

  disabled: {
    opacity: 0.6,
  },

  text: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
  },
});
