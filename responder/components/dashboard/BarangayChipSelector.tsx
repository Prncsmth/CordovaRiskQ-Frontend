// components/responder/BarangayChipSelector.tsx
// Prominent, single-select "jump to one barangay" row for the responder
// Dashboard -- replaces having to scroll past every barangay's section to
// find the one you actually want. "All" restores the unfiltered view;
// selecting a barangay narrows straight to it (via the same
// filters.barangayIds the rest of the filtering pipeline already reads --
// see filterIncidents.ts -- so no separate filtering logic exists here).
// Counts come from whatever incident list the screen already has loaded
// (never a new fetch, never a per-barangay request).
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export type BarangayOption = {
  id: string;
  name: string;
  count: number;
};

export default function BarangayChipSelector({
  barangays,
  totalCount,
  selectedBarangayId,
  onSelect,
}: {
  barangays: BarangayOption[];
  totalCount: number;
  selectedBarangayId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.chip, selectedBarangayId === null && styles.chipSelected]}
      >
        <Text
          style={[
            styles.chipText,
            selectedBarangayId === null && styles.chipTextSelected,
          ]}
        >
          All
        </Text>
        <View style={[styles.countBadge, selectedBarangayId === null && styles.countBadgeSelected]}>
          <Text
            style={[
              styles.countText,
              selectedBarangayId === null && styles.countTextSelected,
            ]}
          >
            {totalCount}
          </Text>
        </View>
      </Pressable>

      {barangays.map((barangay) => {
        const selected = selectedBarangayId === barangay.id;
        return (
          <Pressable
            key={barangay.id}
            onPress={() => onSelect(selected ? null : barangay.id)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
              {barangay.name}
            </Text>
            <View style={[styles.countBadge, selected && styles.countBadgeSelected]}>
              <Text style={[styles.countText, selected && styles.countTextSelected]}>
                {barangay.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: SPACING.md,
      paddingVertical: 10,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    chipSelected: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    chipText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    chipTextSelected: {
      color: COLORS.white,
    },
    countBadge: {
      minWidth: 20,
      paddingHorizontal: 5,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.background,
      alignItems: "center",
      justifyContent: "center",
    },
    countBadgeSelected: {
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    countText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    countTextSelected: {
      color: COLORS.white,
    },
  });
}
