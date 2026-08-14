import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { COLORS, FONT_FAMILY, SPACING, TYPOGRAPHY } from "../../theme";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: SPACING.xl,
  },

  title: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.title,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.gray,
  },
});
