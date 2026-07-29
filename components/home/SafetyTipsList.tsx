import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type SafetyTip = {
  title: string;
  body: string;
};

const TIPS: SafetyTip[] = [
  {
    title: "Know your evacuation route",
    body: "Identify the fastest path to your nearest evacuation center before an emergency happens.",
  },
  {
    title: "Prepare an emergency kit",
    body: "Keep water, flashlights, and important documents ready to grab in one bag.",
  },
  {
    title: "Charge your phone",
    body: "Keep your phone charged during storm warnings so you can call for help.",
  },
];

export default function SafetyTipsList() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Safety Tips</Text>
      <View style={styles.list}>
        {TIPS.map((tip) => (
          <View key={tip.title} style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>{tip.title}</Text>
              <Text style={styles.body}>{tip.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  heading: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    color: COLORS.text,
  },
  list: {
    gap: SPACING.sm,
  },
  card: {
    flexDirection: "row",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.text,
  },
  body: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
