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
    <Animated.View style={[styles.wrap, animatedStyle, style]}>
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
          style={[
            styles.button,
            { shadowColor },
            disabled ? [styles.disabled, styles.disabledShadow] : null,
          ]}
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
    marginBottom: 12,
  },
  // Shadow lives here, on the actual rounded, colored gradient view, not on
  // the invisible `wrap` above it -- on Android, an elevation-based shadow
  // doesn't reliably follow borderRadius when cast by a fully transparent
  // parent with no background establishing that rounded outline, which
  // rendered as a flat rectangular shadow sticking out past the button's
  // curve instead of a soft shadow matching its shape. overflow:"hidden"
  // here only clips this view's CHILDREN (the sheen below) -- a view's own
  // cast shadow is never clipped by its own overflow setting.
  button: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    // Matches `button`'s own radius -- on Android, a nested LinearGradient
    // clipped only by the parent's overflow:"hidden" doesn't always get
    // clipped precisely at rounded corners, letting this rectangle's sharp
    // top corners poke out past the button's curve. Rounding the sheen
    // itself means it tapers correctly even if that clip doesn't apply.
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
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
