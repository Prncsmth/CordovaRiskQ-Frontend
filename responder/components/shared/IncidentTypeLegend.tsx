// responder/components/shared/IncidentTypeLegend.tsx
// Floating legend for the responder Live Map. Same collapsed-by-default
// info button as components/map/MapLegend.tsx (the citizen map's legend), but
// its rows are the incident types -- each one doubles as a filter, so a
// responder can tap "Fire" to show only fire pins, and tap it again to clear.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { CATEGORIES, getCategoryVisual } from "@/components/report/categories";
import { RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export type IncidentTypeKey = "flood" | "fire" | "medical" | "road-accident" | "sos" | "other";

const KNOWN_KEYS: string[] = ["flood", "fire", "medical", "road-accident", "sos"];

// Anything unrecognized renders as "other" on the map (getCategoryVisual's
// own fallback), so it filters under "other" too.
export function toIncidentTypeKey(categoryId: string): IncidentTypeKey {
  return (KNOWN_KEYS.includes(categoryId) ? categoryId : "other") as IncidentTypeKey;
}

const TYPE_ROWS: { key: IncidentTypeKey; label: string }[] = [
  ...CATEGORIES.filter((c) => c.id !== "other").map((c) => ({
    key: c.id as IncidentTypeKey,
    label: c.label,
  })),
  { key: "sos", label: "SOS Alert" },
  { key: "other", label: "Other" },
];

export default function IncidentTypeLegend({
  activeType,
  counts,
  onSelectType,
  style,
}: {
  activeType: IncidentTypeKey | null;
  counts: Partial<Record<IncidentTypeKey, number>>;
  onSelectType: (type: IncidentTypeKey) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {open && (
        <View style={styles.card}>
          <Text style={styles.title}>Incident Types</Text>
          {TYPE_ROWS.map((row) => {
            const visual = getCategoryVisual(row.key);
            const isActive = activeType === row.key;
            return (
              <Pressable
                key={row.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectType(row.key);
                }}
                style={[styles.row, isActive && styles.rowActive]}
                accessibilityRole="button"
                accessibilityLabel={`${isActive ? "Clear filter" : "Show only"} ${row.label.toLowerCase()}`}
              >
                <View style={[styles.swatch, { backgroundColor: visual.color }]}>
                  <Ionicons name={visual.icon} size={14} color={COLORS.white} />
                </View>
                <Text style={styles.label}>{row.label}</Text>
                {isActive ? (
                  <Ionicons name="checkmark-circle" size={18} color={visual.color} />
                ) : (
                  <Text style={styles.count}>{counts[row.key] ?? 0}</Text>
                )}
              </Pressable>
            );
          })}
          <View style={styles.footerRow}>
            <View style={[styles.swatch, { backgroundColor: COLORS.secondary }]}>
              <Ionicons name="navigate" size={13} color={COLORS.white} />
            </View>
            <Text style={styles.label}>Your location</Text>
          </View>
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
        {open ? (
          <Ionicons name="close" size={20} color={COLORS.gray} />
        ) : (
          <Image
            source={require("@/assets/images/incident-pin.png")}
            style={styles.buttonPin}
            resizeMode="contain"
          />
        )}
        {!open && activeType ? <View style={styles.activeDot} /> : null}
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
    buttonPin: {
      width: 20,
      height: 28,
    },
    activeDot: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 9,
      height: 9,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      borderWidth: 1.5,
      borderColor: COLORS.surface,
    },
    card: {
      marginBottom: SPACING.sm,
      minWidth: 230,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.sm,
      ...SHADOW_LG,
    },
    title: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      color: COLORS.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      paddingHorizontal: SPACING.xs,
      paddingBottom: SPACING.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingVertical: SPACING.xs + 2,
      paddingHorizontal: SPACING.xs,
      borderRadius: RADIUS.md,
    },
    rowActive: {
      backgroundColor: COLORS.surface,
    },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingVertical: SPACING.xs + 2,
      paddingHorizontal: SPACING.xs,
      marginTop: SPACING.xs,
      borderTopWidth: 1,
      borderTopColor: COLORS.borderMuted,
    },
    swatch: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      flex: 1,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.text,
      fontWeight: "600",
    },
    count: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      fontWeight: "700",
    },
  });
}
