// responder/components/shared/IncidentMapLegend.tsx
// Floating "what do the marker colors mean" toggle for the responder's Live
// Map -- same collapsed-by-default pattern as the citizen map's own
// MapLegend.tsx, but listing the categories that actually appear on THIS
// map (LiveMapScreen colors every marker via components/report/categories's
// getCategoryVisual, not the citizen map's evacuation-center statuses), plus
// the responder's own logo marker. Each category row is also a filter --
// tapping one asks the map to show only that category's markers (tapping
// the already-selected one clears back to showing everything).
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
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

import { CATEGORIES } from "@/components/report/categories";
import { RADIUS, SHADOW, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

type LegendItem = {
  key: string;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function IncidentMapLegend({
  style,
  selectedCategory = null,
  onSelectCategory,
}: {
  style?: StyleProp<ViewStyle>;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [open, setOpen] = useState(false);

  // Same category set + colors LiveMapScreen actually paints its markers
  // with ("sos" isn't one of CATEGORIES -- it's a separate incident source,
  // not a reportable category -- so it's added by hand here).
  const items: LegendItem[] = [
    { key: "sos", label: "SOS Alert", color: "#DC2626", icon: "warning" },
    ...CATEGORIES.map((c) => ({ key: c.id, label: c.label, color: c.color, icon: c.icon })),
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
          {items.map((item) => {
            const isSelected = selectedCategory === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectCategory?.(isSelected ? null : item.key);
                }}
                style={[
                  styles.row,
                  styles.rowDivider,
                  isSelected && { backgroundColor: `${item.color}1A` },
                ]}
              >
                <View style={styles.swatch}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text style={[styles.label, isSelected && { color: item.color }]}>
                  {item.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color={item.color} />
                )}
              </Pressable>
            );
          })}
          <View style={styles.row}>
            <View style={styles.swatch}>
              <Image
                source={require("@/assets/images/riskq.png")}
                style={styles.logoSwatch}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.label}>Your location</Text>
          </View>
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
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      ...SHADOW_LG,
    },
    card: {
      marginBottom: SPACING.sm,
      minWidth: 200,
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
    logoSwatch: {
      width: 18,
      height: 18,
    },
    label: {
      flex: 1,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.text,
      fontWeight: "600",
    },
  });
}
