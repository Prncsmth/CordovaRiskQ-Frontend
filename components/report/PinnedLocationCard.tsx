import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import AppMap from "@/components/map/AppMap";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import { isInsideCordova } from "@/utils/geofence";

type PinnedLocationCardProps = {
  address: string;
  latitude: number;
  longitude: number;
};

const MAP_HEIGHT = 210;

export default function PinnedLocationCard({
  address,
  latitude,
  longitude,
}: PinnedLocationCardProps) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const withinCordova = isInsideCordova(latitude, longitude);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/(tabs)/map");
        }}
        onPressIn={() => {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, mutable by design
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, mutable by design
          scale.value = withTiming(1, { duration: 100 });
        }}
        style={styles.wrap}
      >
      <View style={styles.mapBox}>
        <AppMap
          style={styles.map}
          center={{ latitude, longitude }}
          zoom={15}
          interactive={false}
          showLayerSwitcher={false}
          markers={[{ id: "pin", latitude, longitude, color: COLORS.primary }]}
        />

        <View
          style={[
            styles.geofenceBadge,
            {
              backgroundColor: withinCordova ? COLORS.successBg : COLORS.warningBg,
            },
          ]}
        >
          <Ionicons
            name={withinCordova ? "checkmark-circle" : "alert-circle"}
            size={12}
            color={withinCordova ? COLORS.success : COLORS.warning}
          />
          <Text
            style={[
              styles.geofenceBadgeText,
              { color: withinCordova ? COLORS.success : COLORS.warning },
            ]}
          >
            {withinCordova ? "Within Cordova" : "Outside Cordova"}
          </Text>
        </View>

        <View style={styles.changeBadge}>
          <Ionicons name="create-outline" size={13} color={COLORS.white} />
          <Text style={styles.changeText}>Change</Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location" size={15} color={COLORS.primary} />
        <Text style={styles.caption}>{address}</Text>
        <View style={styles.autoBadge}>
          <Text style={styles.autoBadgeText}>Auto-detected</Text>
        </View>
      </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    padding: SPACING.md,
    ...SHADOW_LG,
  },
  geofenceBadge: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  geofenceBadgeText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  mapBox: {
    height: MAP_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  changeBadge: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(23, 24, 26, 0.72)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  changeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  caption: {
    flex: 1,
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
  autoBadge: {
    backgroundColor: COLORS.tideTint,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  autoBadgeText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.tide,
  },
  });
}
