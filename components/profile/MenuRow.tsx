import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  // Secondary line under the label (e.g. "Managed securely by Google").
  description?: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

export default function MenuRow({ icon, label, description, onPress, right }: MenuRowProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <View style={styles.row}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={18} color={COLORS.gray} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {right ?? (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textFaint} />
      )}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
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
        {content}
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    color: COLORS.text,
  },
  description: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  });
}
