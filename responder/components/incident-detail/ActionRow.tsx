// components/responder/incident-detail/ActionRow.tsx
// Tappable settings-style row used by ArrivedView's action list (Back to
// Home / Cancel Incident) -- a lower-emphasis alternative to RButton for
// secondary, chevron-navigable actions.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default function ActionRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const tint = danger ? COLORS.danger : COLORS.tide;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.actionRow}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <View
          style={[styles.actionIcon, { backgroundColor: `${tint}1A` }]}
        >
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text style={[styles.actionLabel, danger && { color: COLORS.danger }]}>
          {label}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={COLORS.textTertiary}
        />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
      gap: SPACING.sm,
      ...SHADOW,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      fontWeight: "600",
      color: COLORS.text,
    },
  });
}
