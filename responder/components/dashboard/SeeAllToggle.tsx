// components/responder/SeeAllToggle.tsx
// "See All (N more)" / "Show Less" toggle button, shared by the Dashboard's
// Nearest-to-You header and each barangay section's footer -- previously
// the same Pressable+Text markup copied in both places.
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function SeeAllToggle({
  expanded,
  remainingCount,
  onPress,
}: {
  expanded: boolean;
  remainingCount: number;
  onPress: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <Pressable
      style={styles.button}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Text style={styles.text}>
        {expanded ? "Show Less" : `See All (${remainingCount} more)`}
      </Text>
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    button: {
      alignSelf: "flex-start",
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
    },
    text: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.primary,
    },
  });
}
