import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { COLORS, RADIUS, SPACING } from "@/theme";

interface StepIndicatorProps {
  step: 0 | 1 | 2;
  totalSteps?: number;
  style?: StyleProp<ViewStyle>;
}

export default function StepIndicator({
  step,
  totalSteps = 3,
  style,
}: StepIndicatorProps) {
  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step + 1} of ${totalSteps}`}
      accessibilityValue={{ min: 1, max: totalSteps, now: step + 1 }}
    >
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i <= step ? styles.segmentDone : styles.segmentPending,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: SPACING.xs,
  },

  segment: {
    flex: 1,
    height: 4,
    borderRadius: RADIUS.full,
  },

  segmentDone: {
    backgroundColor: COLORS.primary,
  },

  segmentPending: {
    backgroundColor: COLORS.borderMuted,
  },
});
