import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { useThemeColors, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  hintTone?: "neutral" | "success" | "error";
} & Pick<TextInputProps, "returnKeyType" | "onSubmitEditing" | "autoFocus">;

export default function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  hintTone = "neutral",
  returnKeyType,
  onSubmitEditing,
  autoFocus,
}: PasswordFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const hintColor =
    hintTone === "error"
      ? COLORS.danger
      : hintTone === "success"
        ? COLORS.success
        : COLORS.textSecondary;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, isFocused && styles.fieldFocused]}>
        <Ionicons
          name="lock-closed-outline"
          size={17}
          color={isFocused ? COLORS.primary : COLORS.textTertiary}
          style={styles.leadingIcon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <Pressable
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsVisible((v) => !v);
          }}
        >
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={19}
            color={COLORS.textTertiary}
          />
        </Pressable>
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: hintColor }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      gap: SPACING.xs,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginLeft: SPACING.xs,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      height: 52,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      borderColor: COLORS.borderMuted,
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.md,
      gap: SPACING.sm,
      ...SHADOW,
    },
    fieldFocused: {
      borderColor: COLORS.primary,
    },
    leadingIcon: {
      width: 18,
    },
    input: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      height: "100%",
    },
    hint: {
      fontSize: TYPOGRAPHY.small,
      marginLeft: SPACING.xs,
    },
  });
}
