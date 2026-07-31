import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    color: "#6b7280",
    textAlign: "center",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
});
