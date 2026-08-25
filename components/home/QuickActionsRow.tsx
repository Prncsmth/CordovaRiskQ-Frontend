import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

export default function QuickActionsRow() {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // Each action's designated color ties back to how its destination screen
  // is already color-coded elsewhere: red for reporting/danger, green for
  // evacuation "Open" status, teal for contacts/trust.
  const actions: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
  }[] = [
    {
      key: "report",
      label: "Report Incident",
      icon: "warning",
      color: COLORS.primary,
      onPress: () => router.push("/(tabs)/report"),
    },
    {
      key: "evacuation",
      label: "Evacuation Center",
      icon: "home",
      color: COLORS.success,
      onPress: () => router.push("/(tabs)/map"),
    },
    {
      key: "contacts",
      label: "Emergency Contacts",
      icon: "call",
      color: COLORS.tide,
      onPress: () => router.push("/contacts"),
    },
  ];

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <QuickActionCard key={action.key} action={action} styles={styles} />
      ))}
    </View>
  );
}

function QuickActionCard({
  action,
  styles,
}: {
  action: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress: () => void;
  };
  styles: ReturnType<typeof createStyles>;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.card, { borderLeftColor: action.color }, animatedStyle]}
    >
      <Pressable
        style={styles.cardPressable}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          action.onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${action.color}1A` }]}>
          <Ionicons name={action.icon} size={18} color={action.color} />
        </View>
        <Text style={styles.label}>{action.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: SPACING.sm,
    },
    card: {
      flex: 1,
      backgroundColor: COLORS.background,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      borderLeftWidth: 4,
      ...SHADOW,
    },
    cardPressable: {
      paddingVertical: SPACING.sm + 2,
      alignItems: "center",
      justifyContent: "center",
    },
    iconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.xs,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.text,
      textAlign: "center",
      lineHeight: 18,
    },
  });
}
