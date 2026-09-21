// components/map/MapLegend.tsx
// Floating "what do the marker colors mean" toggle for the map screen.
// Collapsed by default (just an info button) so it doesn't add permanent
// clutter; tapping it expands a small legend card above the button.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { RADIUS, SHADOW, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

// Matches the citizen dot's color in MapboxMap.tsx/LeafletMap.tsx -- the
// classic "you are here" blue, distinct from any theme accent.
const USER_LOCATION_BLUE = "#2563EB";

type LegendItem = {
  key: string;
  label: string;
  // Mirrors the two real marker looks on the map, instead of a plain color
  // swatch that no longer matches either one: "pin" for the flat location
  // icon evacuation centers use, "dot" for the small ringed circle the
  // live-location indicator uses.
  kind: "pin" | "dot";
  color: string;
};

export default function MapLegend({ style }: { style?: StyleProp<ViewStyle> }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [open, setOpen] = useState(false);

  const items: LegendItem[] = [
    { key: "open", label: "Open evacuation center", kind: "pin", color: COLORS.success },
    { key: "full", label: "Full evacuation center", kind: "pin", color: COLORS.danger },
    { key: "you", label: "Your location", kind: "dot", color: USER_LOCATION_BLUE },
  ];

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    if (open) {
      opacity.value = withTiming(1, { duration: 160 });
      scale.value = withTiming(1, { duration: 160 });
    } else {
      opacity.value = 0;
      scale.value = 0.94;
    }
  }, [open, opacity, scale]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.wrap, style]}>
      {open && (
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <Text style={styles.title}>Map Legend</Text>
          {items.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.row,
                index < items.length - 1 && styles.rowDivider,
              ]}
            >
              <View style={styles.swatch}>
                {item.kind === "pin" ? (
                  <Ionicons name="location" size={20} color={item.color} />
                ) : (
                  <View style={styles.dotOuter}>
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                  </View>
                )}
              </View>
              <Text style={styles.label}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>
      )}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setOpen((prev) => !prev);
        }}
        style={styles.button}
        accessibilityLabel={open ? "Hide map legend" : "Show map legend"}
      >
        <Ionicons
          name={open ? "close" : "information-outline"}
          size={20}
          color={COLORS.gray}
        />
      </Pressable>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      alignItems: "flex-start",
    },
    button: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      ...SHADOW_LG,
    },
    card: {
      marginBottom: SPACING.sm,
      minWidth: 220,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.xs,
      ...SHADOW_LG,
    },
    title: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      color: COLORS.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: SPACING.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingVertical: SPACING.xs + 2,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderMuted,
    },
    swatch: {
      width: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    dotOuter: {
      width: 16,
      height: 16,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.white,
      ...SHADOW,
    },
    dot: {
      width: 9,
      height: 9,
      borderRadius: RADIUS.full,
    },
    label: {
      flex: 1,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.text,
      fontWeight: "600",
    },
  });
}
