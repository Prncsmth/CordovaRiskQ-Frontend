import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
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
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
  // Read-only display (e.g. the account email): not editable, shown dimmed
  // with a lock so it doesn't look like a broken input.
  readOnly?: boolean;
} & Pick<
  TextInputProps,
  "keyboardType" | "autoCapitalize" | "secureTextEntry" | "placeholder"
>;

export default function ProfileFieldInput({
  label,
  icon,
  value,
  onChangeText,
  containerStyle,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  placeholder,
  readOnly = false,
}: ProfileFieldInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          {icon ? (
            <Ionicons name={icon} size={14} color={COLORS.textSecondary} />
          ) : null}
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : null}
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
          accessibilityState={{ disabled: readOnly }}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {readOnly ? (
          <Ionicons name="lock-closed-outline" size={16} color={COLORS.textTertiary} />
        ) : null}
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      gap: SPACING.xs,
      flex: 1,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginLeft: SPACING.xs,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      height: 52,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      borderColor: COLORS.borderMuted,
      backgroundColor: COLORS.surface,
      paddingHorizontal: SPACING.md,
      gap: SPACING.sm,
    },
    fieldFocused: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.background,
    },
    fieldReadOnly: {
      opacity: 0.7,
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
  });
}
