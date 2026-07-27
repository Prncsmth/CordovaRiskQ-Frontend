import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

type GreetingBlockProps = {
  name: string;
  location: string;
  temperatureC: number;
  weatherDescription: string;
};

export default function GreetingBlock({
  name,
  location,
  temperatureC,
  weatherDescription,
}: GreetingBlockProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.greeting}>Hello, {name}!</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.location}>{location}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.tempRow}>
          <Ionicons name="partly-sunny-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.temp}>{temperatureC}°C</Text>
        </View>
        <Text style={styles.weatherDesc}>{weatherDescription}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  left: {
    flexShrink: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: SPACING.xs,
  },
  location: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  right: {
    alignItems: "flex-end",
  },
  tempRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  temp: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.text,
  },
  weatherDesc: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
