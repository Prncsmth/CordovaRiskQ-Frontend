import React from "react";
import { StyleSheet, View } from "react-native";

export function Marker() {
  return <View style={styles.marker} />;
}

const styles = StyleSheet.create({
  marker: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
});
