import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export default function QuickActionsRow() {
  const router = useRouter();

  const actions: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      key: "report",
      label: "Report Incident",
      icon: "warning-outline",
      onPress: () => router.push("/(tabs)/report"),
    },
    {
      key: "evacuation",
      label: "Evacuation Center",
      icon: "home-outline",
      onPress: () => router.push("/(tabs)/map"),
    },
    {
      key: "contacts",
      label: "Emergency Contacts",
      icon: "call-outline",
      onPress: () => router.push("/contacts"),
    },
  ];

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={styles.card}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.iconCircle}>
            <Ionicons name={action.icon} size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: "center",
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
});
