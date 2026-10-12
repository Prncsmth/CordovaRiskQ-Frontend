import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeColors, RADIUS, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type ProfileFieldInputProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
  // Small helper line under the field (e.g. why the email is locked, or
  // what the mobile number is used for).
  hint?: string;
  // Read-only display (e.g. the account email): not editable, shown dimmed
  // with a lock so it doesn't look like a broken input.
  readOnly?: boolean;
  // A password field: hidden by default, with an eye button to show it.
  password?: boolean;
  // Tints the hint (e.g. red for "Passwords don't match").
  hintTone?: "neutral" | "success" | "error";
} & Pick<
  TextInputProps,
  | "keyboardType"
  | "autoCapitalize"
  | "secureTextEntry"
  | "placeholder"
  | "autoComplete"
  | "returnKeyType"
  | "onSubmitEditing"
>;

// A plain labeled text field: label above, a rounded box that turns red
// when focused, and an optional hint below.
export default function ProfileFieldInput({
  label,
  value,
  onChangeText,
  containerStyle,
  hint,
  keyboardType,
  autoCapitalize,
  autoComplete,
  secureTextEntry,
  placeholder,
  readOnly = false,
  password = false,
  hintTone = "neutral",
  returnKeyType,
  onSubmitEditing,
}: ProfileFieldInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          isFocused && !readOnly && styles.fieldFocused,
          readOnly && styles.fieldReadOnly,
        ]}
      >
        <TextInput
          style={[styles.input, readOnly && styles.inputReadOnly]}
          value={value}
          onChangeText={onChangeText}
          editable={!readOnly}
          accessibilityLabel={label}
          accessibilityState={{ disabled: readOnly }}
          keyboardType={keyboardType}
          autoCapitalize={password ? "none" : autoCapitalize}
          autoCorrect={password ? false : undefined}
          autoComplete={autoComplete}
          secureTextEntry={password ? !revealed : secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {readOnly ? (
          <Ionicons name="lock-closed-outline" size={16} color={COLORS.textTertiary} />
        ) : null}
        {password ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={COLORS.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <Text
          style={[
            styles.hint,
            hintTone === "error" && { color: COLORS.danger },
            hintTone === "success" && { color: COLORS.success },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      gap: 6,
      flex: 1,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "600",
      color: COLORS.textSecondary,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      height: 50,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.md,
      gap: SPACING.sm,
    },
    fieldFocused: {
      borderColor: COLORS.primary,
    },
    fieldReadOnly: {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.borderMuted,
    },
    input: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      height: "100%",
    },
    inputReadOnly: {
      color: COLORS.textSecondary,
    },
    hint: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
  });
}
