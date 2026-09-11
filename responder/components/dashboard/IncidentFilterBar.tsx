// components/responder/IncidentFilterBar.tsx
// Search input + horizontal chip row for the responder Dashboard: fixed
// Urgency chips plus Type/Barangay chips derived from whichever incidents
// are currently on screen (passed in by the caller). Selections within a
// category OR together; categories AND against each other -- the actual
// narrowing happens in filterIncidents, this component only edits filters.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { IncidentFilters } from "@/responder/components/dashboard/filterIncidents";
import {
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Urgency } from "@/responder/types/responder";

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function urgencyColor(urgency: Urgency, COLORS: ColorPalette): string {
  if (urgency === "high") return COLORS.primary;
  if (urgency === "medium") return COLORS.warning;
  return COLORS.success;
}

function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export type IncidentFilterBarProps = {
  filters: IncidentFilters;
  onFiltersChange: (filters: IncidentFilters) => void;
  availableTypes: string[];
  availableBarangays: { id: string; name: string }[];
};

export default function IncidentFilterBar({
  filters,
  onFiltersChange,
  availableTypes,
  availableBarangays,
}: IncidentFilterBarProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.urgencies.size > 0 ||
    filters.types.size > 0 ||
    filters.barangayIds.size > 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          value={filters.search}
          onChangeText={(text) => onFiltersChange({ ...filters, search: text })}
          placeholder="Search type, location, barangay..."
          placeholderTextColor={COLORS.textSecondary}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {filters.search.length > 0 && (
          <Pressable
            hitSlop={12}
            onPress={() => onFiltersChange({ ...filters, search: "" })}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {URGENCY_OPTIONS.map((option) => {
          const selected = filters.urgencies.has(option.value);
          const color = urgencyColor(option.value, COLORS);
          return (
            <Pressable
              key={option.value}
              hitSlop={4}
              onPress={() =>
                onFiltersChange({
                  ...filters,
                  urgencies: toggled(filters.urgencies, option.value),
                })
              }
              style={[
                styles.chip,
                selected && { backgroundColor: `${color}1A`, borderColor: color },
              ]}
            >
              <View style={[styles.chipDot, { backgroundColor: color }]} />
              <Text style={[styles.chipText, selected && { color }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}

        {availableTypes.map((type) => {
          const selected = filters.types.has(type);
          return (
            <Pressable
              key={type}
              hitSlop={4}
              onPress={() =>
                onFiltersChange({ ...filters, types: toggled(filters.types, type) })
              }
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {type}
              </Text>
            </Pressable>
          );
        })}

        {availableBarangays.map((barangay) => {
          const selected = filters.barangayIds.has(barangay.id);
          return (
            <Pressable
              key={barangay.id}
              hitSlop={4}
              onPress={() =>
                onFiltersChange({
                  ...filters,
                  barangayIds: toggled(filters.barangayIds, barangay.id),
                })
              }
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {barangay.name}
              </Text>
            </Pressable>
          );
        })}

        {hasActiveFilters && (
          <Pressable
            hitSlop={4}
            onPress={() =>
              onFiltersChange({
                search: "",
                urgencies: new Set(),
                types: new Set(),
                barangayIds: new Set(),
              })
            }
            style={styles.clearChip}
          >
            <Ionicons name="close" size={14} color={COLORS.textSecondary} />
            <Text style={styles.clearChipText}>Clear all</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: COLORS.background,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
      gap: SPACING.md,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      marginHorizontal: SPACING.md,
      backgroundColor: COLORS.inputBg,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: SPACING.md,
      height: 48,
    },
    searchInput: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      padding: 0,
    },
    chipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      // A little vertical room so the chip row's own shadow/border isn't
      // clipped by the ScrollView, and selected chips don't feel cramped
      // against the row above/below.
      paddingVertical: SPACING.xs,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingVertical: 10,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: RADIUS.full,
    },
    chipSelected: {
      backgroundColor: COLORS.primaryTint,
      borderColor: COLORS.primary,
    },
    chipText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      color: COLORS.textSecondary,
    },
    chipTextSelected: {
      color: COLORS.primary,
    },
    clearChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 10,
    },
    clearChipText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      color: COLORS.textSecondary,
      textDecorationLine: "underline",
    },
  });
}
