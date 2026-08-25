import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { RADIUS, SPACING, useThemeColors, type ColorPalette } from "@/theme";

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
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step + 1} of ${totalSteps}`}
      accessibilityValue={{ min: 1, max: totalSteps, now: step + 1 }}
    >
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isActive = i === step;
        const isDone = i < step;

        if (isActive || isDone) {
          return (
            <LinearGradient
              key={i}
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.segment,
                isActive ? styles.segmentActive : styles.segmentDone,
              ]}
            />
          );
        }

        return <View key={i} style={[styles.segment, styles.segmentPending]} />;
      })}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
    },

    segment: {
      flex: 1,
      height: 6,
      borderRadius: RADIUS.full,
    },

    segmentActive: {
      flex: 1.7,
    },

    segmentDone: {
      flex: 1,
    },

    segmentPending: {
      backgroundColor: COLORS.borderMuted,
    },
  });
}
