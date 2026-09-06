// components/map/SearchBar.tsx
// Floating barangay search box + result dropdown shown over the map
// screen. Forwards its ref to the outer positioned View so
// MapFirstTimeGuide can measure it as a tour target.
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

import type { Barangay } from "@/constants/cordovaBarangays";
import {
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default React.forwardRef<View, {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  results: Barangay[];
  onSelectResult: (barangay: Barangay) => void;
  style?: StyleProp<ViewStyle>;
}>(function SearchBar(
  { value, onChangeText, onClear, results, onSelectResult, style },
  ref,
) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View ref={ref} collapsable={false} style={[styles.searchContainer, style]}>
      <BlurView intensity={60} tint={COLORS.glassTint} style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search barangay..."
          placeholderTextColor={COLORS.textSecondary}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable hitSlop={8} onPress={onClear} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </Pressable>
        )}
      </BlurView>

      {results.length > 0 && (
        <View style={styles.searchResults}>
          {results.map((barangay) => (
            <Pressable
              key={barangay.id}
              onPress={() => onSelectResult(barangay)}
              style={styles.searchResultRow}
            >
              <View style={styles.searchResultIcon}>
                <Ionicons name="location-outline" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.searchResultText}>{barangay.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    searchContainer: {
      // Stops short of the right edge (instead of spanning full width) so it
      // doesn't cover the map's layer switcher control, which sits in the
      // top-right corner of the map itself.
      position: "absolute",
      top: SPACING.md,
      left: SPACING.md,
      right: 64,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      overflow: "hidden",
      backgroundColor: COLORS.glassOverlay,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      paddingHorizontal: SPACING.md,
      height: 44,
      ...SHADOW_LG,
    },
    searchInput: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      padding: 0,
    },
    searchResults: {
      marginTop: SPACING.xs,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingVertical: SPACING.xs,
      ...SHADOW_LG,
    },
    searchResultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    searchResultIcon: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    searchResultText: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
    },
  });
}
