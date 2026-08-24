import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "../../theme";

interface AuthFooterProps {
  promptText: string;
  actionText: string;
  onPress: () => void;
}

export default function AuthFooter({
  promptText,
  actionText,
  onPress,
}: AuthFooterProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{promptText}</Text>
      <TouchableOpacity
        hitSlop={8}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <Text style={styles.action}>{actionText}</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: SPACING.lg,
    },

    prompt: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      marginRight: SPACING.xs,
    },

    action: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.primary,
      fontWeight: "600",
    },
  });
}
