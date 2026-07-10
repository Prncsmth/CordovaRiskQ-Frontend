import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { COLORS, SPACING, TYPOGRAPHY } from "../../theme";

interface AuthFooterProps {
  promptText: string;
  actionText: string;
  onPress: () => void;
}

export default function AuthFooter({
  promptText,
  actionText,
  onPress,
}: AuthFooterProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{promptText}</Text>
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.action}>{actionText}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING.lg,
  },

  prompt: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.gray,
    marginRight: SPACING.xs,
  },

  action: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
