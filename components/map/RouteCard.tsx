import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function RouteCard({ title }: { title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
  },
  title: {
    fontWeight: "600",
  },
});
