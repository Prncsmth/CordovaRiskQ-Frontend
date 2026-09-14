// components/map/MapLegend.tsx
// Floating "what do the marker colors mean" toggle for the map screen.
// Collapsed by default (just an info button) so it doesn't add permanent
// clutter; tapping it expands a small legend card above the button.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

// Matches the citizen dot's color in MapboxMap.tsx/LeafletMap.tsx -- the
// classic "you are here" blue, distinct from any theme accent.
const USER_LOCATION_BLUE = "#2563EB";

export default function MapLegend({ style }: { style?: StyleProp<ViewStyle> }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [open, setOpen] = useState(false);

  const items = [
    { color: COLORS.success, label: "Open evacuation center" },
    { color: COLORS.danger, label: "Full evacuation center" },
    { color: USER_LOCATION_BLUE, label: "Your location" },
  ];

  return (
    <View style={[styles.wrap, style]}>
      {open && (
        <View style={styles.card}>
          {items.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.label}>{item.label}</Text>
            </View>
          ))}
        </View>
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
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.sm,
      gap: SPACING.xs,
      ...SHADOW_LG,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: RADIUS.full,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.text,
      fontWeight: "600",
    },
  });
}
