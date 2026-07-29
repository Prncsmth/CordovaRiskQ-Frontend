import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CATEGORIES, type CategoryId } from "@/components/report/categories";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type CategoryGridProps = {
  selected: CategoryId | null;
  onSelect: (id: CategoryId) => void;
};

export default function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((category) => {
        const isSelected = category.id === selected;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.card,
              isSelected && {
                backgroundColor: `${category.color}14`,
                borderColor: category.color,
              },
            ]}
            onPress={() => onSelect(category.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${category.color}1A` }]}>
              <Ionicons name={category.icon} size={20} color={category.color} />
            </View>
            <Text style={[styles.label, isSelected && { color: category.color }]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  card: {
    width: "48%",
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
});
