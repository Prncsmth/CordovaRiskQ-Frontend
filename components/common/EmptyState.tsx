import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

export function EmptyState({
  message,
  subtitle,
}: {
  message: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.caption,
    textAlign: "center",
    marginTop: 4,
  },
});
