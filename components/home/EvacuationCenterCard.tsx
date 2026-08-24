import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { type EvacuationCenter } from "@/services/evacuation.service";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";

type EvacuationCenterCardProps = {
  center: EvacuationCenter;
};

export default function EvacuationCenterCard({
  center,
}: EvacuationCenterCardProps) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const isOpen = center.status === "open";

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable
        style={styles.pressable}
        onPress={() => router.push(`/evacuation-detail/${center.id}`)}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <PlaceholderThumb style={styles.thumb} />
        <View style={styles.textCol}>
          <Text style={styles.name} numberOfLines={2}>
            {center.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {center.address}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.distanceRow}>
              <Ionicons
                name="navigate-outline"
                size={13}
                color={COLORS.textSecondary}
              />
              <Text style={styles.meta}>{center.distanceKm} km away</Text>
            </View>

            <View
              style={[
                styles.statusPill,
                { backgroundColor: isOpen ? COLORS.successBg : COLORS.primaryTint },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isOpen ? COLORS.success : COLORS.primary },
                ]}
              >
                {isOpen ? "Open" : "Full"}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      ...SHADOW,
    },
    pressable: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      padding: SPACING.md,
    },
    thumb: {
      width: 76,
      height: 76,
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
    },
    address: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: SPACING.xs,
    },
    distanceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    meta: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
    statusPill: {
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
    },
    statusText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
  });
}
