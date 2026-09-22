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
}: ProfileFieldInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}:</Text> : null}
      <View style={[styles.field, isFocused && styles.fieldFocused]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={17}
            color={isFocused ? COLORS.primary : COLORS.textTertiary}
            style={styles.leadingIcon}
          />
        ) : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
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
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      marginLeft: SPACING.xs,
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
    leadingIcon: {
      width: 18,
    },
    input: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      height: "100%",
    },
  });
}
