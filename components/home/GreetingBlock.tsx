import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type GreetingBlockProps = {
  name: string;
  location: string;
};

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function GreetingBlock({ name, location }: GreetingBlockProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.greeting}>
        {getTimeOfDayGreeting().toUpperCase()}, {name.toUpperCase()}
      </Text>
      <View style={styles.locationRow}>
        <Ionicons name="location" size={14} color={COLORS.primary} />
        <Text style={styles.location}>{location}</Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      gap: SPACING.xs,
    },
    greeting: {
      fontSize: TYPOGRAPHY.subtitle,
      fontWeight: "700",
      color: COLORS.text,
      letterSpacing: 0.6,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    location: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
  });
}
