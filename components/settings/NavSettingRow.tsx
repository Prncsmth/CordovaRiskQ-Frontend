// components/settings/NavSettingRow.tsx
// Tappable, chevron-navigable row used by the Settings screen's Account
// and Support sections.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export type NavRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

export default function NavSettingRow({ row }: { row: NavRow }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.row}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          row.onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <LinearGradient
          colors={
            row.danger
              ? [`${COLORS.danger}1A`, `${COLORS.danger}1A`]
              : COLORS.iconTileGradient
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons
            name={row.icon}
            size={18}
            color={row.danger ? COLORS.danger : COLORS.primary}
          />
        </LinearGradient>
        <Text
          style={[
            styles.label,
            styles.navLabel,
            row.danger && { color: COLORS.danger },
          ]}
        >
          {row.label}
        </Text>
        {!row.danger && (
          <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
        )}
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
      paddingVertical: SPACING.sm + 4,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    navLabel: {
      flex: 1,
    },
  });
}
