// app/evacuation-detail/navigate.tsx
// Full-screen route preview, opened from the "View Route" button on an
// evacuation center's detail screen. Shows the real route from the
// citizen's current location to the center (via useRoutes()/directions.service.ts,
// falling back to a straight line while loading or on failure), with a
// walking/driving toggle and route alternatives when Mapbox returns more
// than one. This is a quick in-app glance, not turn-by-turn navigation.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import TravelModeToggle from "@/components/common/TravelModeToggle";
import { useAuth } from "@/context/AuthContext";
import { getEvacuationCenterById, type EvacuationCenter } from "@/services/evacuation.service";
import { getCurrentLocation, type Coordinates } from "@/services/location.service";
import type { TravelProfile } from "@/services/directions.service";
import { useRoutes } from "@/hooks/useRoutes";
import { buildRouteVisuals, routeIndexFromMarkerId } from "@/utils/routeVisuals";
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
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [center, setCenter] = useState<EvacuationCenter | undefined>(undefined);
  const [citizenCoords, setCitizenCoords] = useState<Coordinates | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const mapRef = useRef<MapHandle>(null);
  const [mode, setMode] = useState<TravelProfile>("walking");
  const centerCoords = center ? { latitude: center.latitude, longitude: center.longitude } : undefined;
  const routes = useRoutes(citizenCoords, centerCoords, mode);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // A fresh route set (mode switched, or a new fetch resolved) makes
  // whatever was selected in the old set meaningless -- land back on the
  // fastest route rather than an index that might not exist in the new one.
  useEffect(() => {
    setSelectedRouteIndex(0);
  }, [routes]);

  const route = routes[selectedRouteIndex] ?? null;

  const loadData = useCallback(() => {
    if (!id || !token) return;
    setIsLoading(true);
    Promise.all([getEvacuationCenterById(token, id), getCurrentLocation()])
      .then(([centerData, coords]) => {
        setCenter(centerData);
        setCitizenCoords(coords);
      })
      .finally(() => setIsLoading(false));
  }, [id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!center || !citizenCoords) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Text style={styles.fallbackText}>Location data unavailable.</Text>
        {!citizenCoords && (
          <Pressable onPress={loadData} style={styles.fallbackRetry}>
            <Text style={styles.fallbackRetryText}>Retry</Text>
          </Pressable>
        )}
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
  const isOpen = center.status === "open";
  const statusColor = isOpen ? COLORS.success : COLORS.danger;
  const centerLatLng = { latitude: center.latitude, longitude: center.longitude };
  const { polylines, labelMarkers } = buildRouteVisuals(routes, selectedRouteIndex, COLORS.secondary, [
    citizenCoords,
    centerLatLng,
  ]);

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
          { id: "center", latitude: center.latitude, longitude: center.longitude, color: statusColor },
          ...labelMarkers,
        ]}
        userLocation={citizenCoords}
        polylines={polylines}
        onMarkerPress={(id) => {
          const index = routeIndexFromMarkerId(id);
          if (index !== null) setSelectedRouteIndex(index);
        }}
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
            colors={[statusColor, statusColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.infoIcon, { shadowColor: statusColor }]}
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

        <View style={styles.modeRow}>
          <TravelModeToggle value={mode} onChange={setMode} />
        </View>

        <View style={styles.statRow}>
          <View style={styles.statChip}>
            <Ionicons name="time-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.statChipText} numberOfLines={1}>
              {route ? `${route.durationMin} min ${mode === "walking" ? "walk" : "drive"}` : "—"}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="navigate-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.statChipText} numberOfLines={1}>
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
  modeRow: {
    marginTop: SPACING.sm,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
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
  fallbackRetry: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  fallbackRetryText: {
    color: COLORS.white,
    fontWeight: "700",
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
