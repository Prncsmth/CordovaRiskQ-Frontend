import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "../../theme";

interface AuthInputProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  rightLabel?: string;
  onRightLabelPress?: () => void;
  secureToggle?: boolean;
}

export default function AuthInput({
  icon,
  label,
  rightLabel,
  onRightLabelPress,
  secureToggle = false,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}: AuthInputProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  // Driven by a Reanimated shared value instead of React state: updating it
  // from onFocus/onBlur animates the border on the UI thread without
  // re-rendering this component. Re-rendering AuthInput synchronously on the
  // very event that just focused the TextInput causes Android (New
  // Architecture) to immediately drop focus again -- a focus/blur loop that
  // reads as a flickering, unusable input.
  const focus = useSharedValue(0);

  const restingBorderColor = label ? "transparent" : COLORS.border;
  const restingBackgroundColor = label ? COLORS.inputBg : COLORS.surface;

  const animatedContainerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [restingBorderColor, COLORS.primary],
    ),
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [restingBackgroundColor, COLORS.background],
    ),
    shadowOpacity: focus.value * 0.14,
    elevation: focus.value * 3,
  }));

  return (
    <View style={styles.wrapper}>
      {label || rightLabel ? (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {rightLabel ? (
            <TouchableOpacity onPress={onRightLabelPress} hitSlop={8}>
              <Text style={styles.rightLabel}>{rightLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.container,
          label ? styles.containerFlat : null,
          animatedContainerStyle,
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={22} color={COLORS.gray} style={styles.icon} />
        ) : null}

        <TextInput
          placeholderTextColor={COLORS.textTertiary}
          style={styles.input}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          autoComplete="off"
          importantForAutofill="no"
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: 150 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: 150 });
            onBlur?.(e);
          }}
          {...props}
        />

        {secureToggle ? (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={COLORS.gray}
            />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      width: "100%",
      marginBottom: SPACING.md,
    },

    label: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "600",
      color: COLORS.text,
    },

    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACING.xs,
    },

    rightLabel: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      color: COLORS.primary,
    },

    container: {
      flexDirection: "row",
      alignItems: "center",

      width: "100%",
      height: 58,

      // Was hardcoded COLORS.white -- that token stays pure white in dark
      // mode too, which would trap COLORS.text (near-white in dark) on a
      // white background. Use the theme-aware surface token instead so this
      // (currently unused-without-`label`, but still part of the public API)
      // variant stays legible if ever rendered without `containerFlat`.
      backgroundColor: COLORS.surface,

      borderRadius: RADIUS.md,

      borderWidth: 1.5,
      borderColor: COLORS.border,

      paddingHorizontal: SPACING.md,

      ...SHADOW,
    },

    containerFlat: {
      backgroundColor: COLORS.inputBg,
      borderWidth: 1.5,
      borderColor: "transparent",
      shadowOpacity: 0,
      elevation: 0,
    },

    icon: {
      marginRight: SPACING.sm,
    },

    input: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
    },
  });
}
