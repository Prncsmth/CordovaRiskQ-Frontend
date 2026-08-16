import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../../theme";

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
  ...props
}: AuthInputProps) {
  const [hidden, setHidden] = useState(!!secureTextEntry);

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

      <View style={[styles.container, label ? styles.containerFlat : null]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={22}
            color={COLORS.gray}
            style={styles.icon}
          />
        ) : null}

        <TextInput
          placeholderTextColor={COLORS.gray}
          style={styles.input}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
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

const styles = StyleSheet.create({
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

    backgroundColor: COLORS.white,

    borderRadius: RADIUS.md,

    borderWidth: 1,
    borderColor: COLORS.border,

    paddingHorizontal: SPACING.md,

    ...SHADOW,
  },

  containerFlat: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 0,
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
