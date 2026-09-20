// components/common/TravelModeToggle.tsx
// Small walking/driving segmented control used on the route-preview screens
// (evacuation-detail/navigate.tsx, responder/screens/NavigateScreen.tsx) to
// pick which Mapbox Directions profile to request -- see
// services/directions.service.ts's TravelProfile.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TravelProfile } from "@/services/directions.service";
import { RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const OPTIONS: { value: TravelProfile; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "walking", label: "Walk", icon: "walk-outline" },
  { value: "driving", label: "Drive", icon: "car-outline" },
];

export default function TravelModeToggle({
  value,
  onChange,
}: {
  value: TravelProfile;
  onChange: (mode: TravelProfile) => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.wrap}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (active) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(option.value);
            }}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${option.label} directions`}
          >
            <Ionicons
              name={option.icon}
              size={14}
              color={active ? COLORS.white : COLORS.textSecondary}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      backgroundColor: COLORS.tideTint,
      borderRadius: RADIUS.full,
      padding: 3,
      gap: 2,
      alignSelf: "flex-start",
    },
    segment: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 5,
      borderRadius: RADIUS.full,
    },
    segmentActive: {
      backgroundColor: COLORS.secondary,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    labelActive: {
      color: COLORS.white,
    },
  });
}
