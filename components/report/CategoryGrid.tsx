import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { CATEGORIES, type Category, type CategoryId } from "@/components/report/categories";
import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

type CategoryGridProps = {
  selected: CategoryId | null;
  onSelect: (id: CategoryId) => void;
};

export default function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          isSelected={category.id === selected}
          onSelect={onSelect}
          styles={styles}
        />
      ))}
    </View>
  );
}

// Neutral card + a bold colored left-border stripe -- the same "designated
// color" accent used on the home screen's EvacuationCenterCard, so a
// category reads as color-coded without tinting the whole card.
function CategoryCard({
  category,
  isSelected,
  onSelect,
  styles,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: (id: CategoryId) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.cardWrap, animatedStyle]}>
      <Pressable
        style={[
          styles.card,
          { borderLeftColor: category.color },
          isSelected && {
            backgroundColor: `${category.color}14`,
            borderColor: category.color,
            borderLeftColor: category.color,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect(category.id);
        }}
        onPressIn={() => {
          scale.value = withTiming(0.96, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${category.color}1A` }]}>
          <Ionicons name={category.icon} size={24} color={category.color} />
        </View>
        <Text style={[styles.label, { color: category.color }]}>
          {category.label}
        </Text>

        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: category.color }]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  cardWrap: {
    width: "48%",
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderLeftWidth: 4,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
    ...SHADOW,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    textAlign: "center",
  },
  checkBadge: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  });
}
