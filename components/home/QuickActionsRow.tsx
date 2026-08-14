import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/theme";

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
        <QuickActionCard key={action.key} action={action} />
      ))}
    </View>
  );
}

function QuickActionCard({
  action,
}: {
  action: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable
        style={styles.cardPressable}
        onPress={action.onPress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <View style={styles.iconCircle}>
          <Ionicons name={action.icon} size={16} color={COLORS.primary} />
        </View>
        <Text style={styles.label}>{action.label}</Text>
      </Pressable>
    </Animated.View>
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
    borderRadius: RADIUS.md,
    ...SHADOW,
  },
  cardPressable: {
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
