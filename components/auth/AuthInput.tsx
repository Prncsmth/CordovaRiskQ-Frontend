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
  const [isFocused, setIsFocused] = useState(false);

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

      <View
        style={[
          styles.container,
          label ? styles.containerFlat : null,
          isFocused && styles.containerFocused,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={22}
            color={isFocused ? COLORS.primary : COLORS.gray}
            style={styles.icon}
          />
        ) : null}

        <TextInput
          placeholderTextColor={COLORS.textTertiary}
          style={styles.input}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
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
      </View>
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

    containerFocused: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.background,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.14,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
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
