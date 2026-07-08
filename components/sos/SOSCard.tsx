import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function SOSCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontWeight: "700",
    marginBottom: 4,
  },
  message: {
    color: "#4b5563",
  },
});
