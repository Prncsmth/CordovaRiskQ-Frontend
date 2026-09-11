import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

import { darken } from "./colorUtils";

type Variant = "primary" | "secondary" | "success" | "danger";

// Gradient-fill variants get the same two-tone fill + glossy sheen +
// tinted shadow treatment as SOSButton/PrimaryButton. "secondary" stays a
// flat, low-emphasis surface so accept/confirm actions keep visual
// priority over decline/cancel actions.
function getGradientVariants(
  COLORS: ColorPalette,
): Record<Exclude<Variant, "secondary">, { colors: [string, string]; shadowColor: string }> {
  return {
    primary: {
      colors: [COLORS.primary, COLORS.primaryDark],
      shadowColor: COLORS.primary,
    },
    success: {
      colors: [COLORS.success, darken(COLORS.success, 40)],
      shadowColor: COLORS.success,
    },
    danger: {
      colors: [COLORS.danger, darken(COLORS.danger, 40)],
      shadowColor: COLORS.danger,
    },
  };
}

export default function RButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 100 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };
  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  if (variant === "secondary") {
    return (
      <Animated.View style={[animatedStyle, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={[styles.secondaryButton, disabled && styles.disabled]}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={COLORS.text}
              style={styles.icon}
            />
          )}
          <Text style={[styles.label, { color: COLORS.text }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  const { colors, shadowColor } = getGradientVariants(COLORS)[variant];

  return (
    <Animated.View
      style={[
        styles.wrap,
        { shadowColor },
        disabled && styles.disabledShadow,
        animatedStyle,
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, disabled && styles.disabled]}
        >
          <LinearGradient
            colors={[COLORS.sheenOverlay, "rgba(255,255,255,0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.sheen}
          />
          <View style={styles.contentRow}>
            {icon && (
              <Ionicons
                name={icon}
                size={18}
                color={COLORS.white}
                style={styles.icon}
              />
            )}
            <Text style={[styles.label, { color: COLORS.white }]}>
              {label}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.md,
    marginBottom: 12,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  button: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabled: {
    opacity: 0.55,
  },
  disabledShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
  },
  });
}
