// app/evacuation-detail/navigate.tsx
// Full-screen route preview, opened from the "Preview Route" button on an
// evacuation center's detail screen. Shows the real walking route from the
// citizen's current location to the center (via useRoute()/directions.service.ts,
// falling back to a straight line while loading or on failure). This is a
// quick in-app glance, not turn-by-turn navigation -- "GET DIRECTIONS" on the
// detail screen still opens the device's native Maps app for that.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import { getEvacuationCenterById, type EvacuationCenter } from "@/services/evacuation.service";
import { getCurrentLocation, type Coordinates } from "@/services/location.service";
import { useRoute } from "@/hooks/useRoute";
import {
    FONT_FAMILY,
    RADIUS,
    SHADOW,
    SHADOW_LG,
    SPACING,
    TYPOGRAPHY,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

export default function EvacuationNavigateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [center, setCenter] = useState<EvacuationCenter | undefined>(undefined);
  const [citizenCoords, setCitizenCoords] = useState<Coordinates | undefined>();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const mapRef = useRef<MapHandle>(null);
  const centerCoords = center ? { latitude: center.latitude, longitude: center.longitude } : undefined;
  const route = useRoute(citizenCoords, centerCoords, "walking");

  useEffect(() => {
    if (!id) return;
    getEvacuationCenterById(id).then(setCenter);
    getCurrentLocation().then(setCitizenCoords).catch(() => {});
  }, [id]);

  if (!center || !citizenCoords) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Text style={styles.fallbackText}>Location data unavailable.</Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const midpoint = {
    latitude: (citizenCoords.latitude + center.latitude) / 2,
    longitude: (citizenCoords.longitude + center.longitude) / 2,
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />

      <AppMap
        ref={mapRef}
        style={styles.map}
        center={midpoint}
        zoom={14}
        showLayerSwitcher
        markers={[
          { id: "citizen", ...citizenCoords, color: COLORS.secondary, icon: "logo" },
          { id: "center", latitude: center.latitude, longitude: center.longitude, color: COLORS.primary },
        ]}
        polylines={[
          {
            points: route ? route.coordinates : [citizenCoords, { latitude: center.latitude, longitude: center.longitude }],
            color: COLORS.secondary,
            dashed: false,
            weight: 4,
          },
        ]}
        onReady={() =>
          mapRef.current?.fitToPoints(
            [citizenCoords, { latitude: center.latitude, longitude: center.longitude }],
            insets.top + 140,
          )
        }
      />

      <View style={[styles.topCard, { top: insets.top + SPACING.sm }]}>
        <View style={styles.topCardHeader}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.infoIcon, { shadowColor: COLORS.primary }]}
          >
            <Ionicons name="home" size={16} color={COLORS.white} />
          </LinearGradient>
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle} numberOfLines={1}>
              {center.name}
            </Text>
            <Text style={styles.infoSubtitle} numberOfLines={1}>
              {center.address}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={10}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statChip}>
            <Ionicons name="time-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.statChipText}>
              {route ? `${route.durationMin} min walk` : "—"}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="navigate-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.statChipText}>
              {route ? `${route.distanceKm.toFixed(1)} km` : `${center.distanceKm.toFixed(1)} km`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  topCard: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: SPACING.md,
    ...SHADOW_LG,
  },
  topCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  infoTextCol: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
  infoSubtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  statRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.tideTint,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  statChipText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.tide,
  },
  fallbackScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  fallbackText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.body,
  },
  fallbackClose: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  fallbackCloseText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  });
}
