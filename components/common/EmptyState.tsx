import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
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
});
