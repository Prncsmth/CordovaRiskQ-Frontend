import React from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
} from "../../theme";

interface AuthInputProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
}

export default function AuthInput({
  icon,
  ...props
}: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name={icon}
        size={22}
        color={COLORS.gray}
        style={styles.icon}
      />

      <TextInput
        placeholderTextColor={COLORS.gray}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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

    marginBottom: SPACING.md,

    ...SHADOW,
  },

  icon: {
    marginRight: SPACING.sm,
  },

  input: {
    flex: 1,

    fontSize: 16,

    color: COLORS.text,
  },
});