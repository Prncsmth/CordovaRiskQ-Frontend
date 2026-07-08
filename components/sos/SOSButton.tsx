import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export function SOSButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>SOS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
