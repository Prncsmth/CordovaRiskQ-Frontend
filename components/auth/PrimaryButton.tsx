import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
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

import { FONT_FAMILY, useThemeColors, SPACING, RADIUS, TYPOGRAPHY, type ColorPalette } from "../../theme";

interface PrimaryButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  // Overrides the default red brand gradient -- for CTAs on a page themed
  // around a different accent (e.g. Contact Support's teal), so the button
  // doesn't clash with the rest of that screen.
  colors?: readonly [string, string];
  // Optional icon shown after the title (e.g. an arrow on a "Continue" CTA).
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  // Optional icon shown before the title (e.g. "add" on New Report).
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  // A full pill shape (the Home SOS button's silhouette) instead of the
  // rounded rectangle, same red gradient -- for the report actions (New
  // Report, Submit Report). Off by default: every other button is unchanged.
  pill?: boolean;
}

export default function PrimaryButton({
  title,
  loading = false,
  disabled,
  style,
  onPress,
  onPressIn,
  onPressOut,
  colors,
  trailingIcon,
  leadingIcon,
  pill = false,
  ...props
}: PrimaryButtonProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const gradientColors = colors ?? [COLORS.primary, COLORS.primaryDark];
  const shadowColor = colors ? colors[0] : COLORS.primary;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderContent = () =>
    loading ? (
      <ActivityIndicator color={COLORS.white} />
    ) : (
      <View style={styles.content}>
        {leadingIcon ? <Ionicons name={leadingIcon} size={22} color={COLORS.white} /> : null}
        <Text style={[styles.text, pill && styles.textPill]}>{title}</Text>
        {trailingIcon ? <Ionicons name={trailingIcon} size={18} color={COLORS.white} /> : null}
      </View>
    );

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.wrap,
          pill && styles.wrapPill,
          { shadowColor },
          (disabled || loading) && styles.disabled,
          style,
        ]}
        disabled={disabled || loading}
        onPress={(e) => {
          if (!disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress?.(e);
        }}
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
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, pill && styles.buttonPill]}
        >
          <LinearGradient
            colors={[COLORS.sheenOverlay, "rgba(255,255,255,0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.sheen}
          />
          {renderContent()}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  button: {
    height: 56,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  // Pill silhouette like components/sos/SOSButton.tsx; colors unchanged.
  wrapPill: {
    borderRadius: RADIUS.full,
  },

  buttonPill: {
    height: 54,
    borderRadius: RADIUS.full,
  },

  textPill: {
    fontFamily: FONT_FAMILY.display,
  },

  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
  },

  disabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },

  text: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  });
}