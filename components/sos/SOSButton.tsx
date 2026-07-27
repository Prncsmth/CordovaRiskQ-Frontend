import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export function SOSButton({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.glow}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.text}>SOS</Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>Tap to alert emergency responders</Text>
    </View>
  );
}

const BUTTON_SIZE = 150;
const GLOW_SIZE = 170;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  glow: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  text: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: TYPOGRAPHY.heading,
    letterSpacing: 1,
  },
  caption: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
});
