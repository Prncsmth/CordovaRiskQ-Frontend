import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import {
  FONT_FAMILY,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "../../theme";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      width: "100%",
      marginBottom: SPACING.xl,
    },

    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      color: COLORS.text,
      letterSpacing: -0.5,
      lineHeight: TYPOGRAPHY.title + 4,
      marginBottom: SPACING.xs,
    },

    subtitle: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      lineHeight: 22,
    },
  });
}
