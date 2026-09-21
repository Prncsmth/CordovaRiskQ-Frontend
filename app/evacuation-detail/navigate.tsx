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

// "Arriving" time-of-day shown in the trip stats bar -- now + the route's
// remaining time, formatted the way a dashboard clock would show it. Same
// treatment as responder/screens/NavigateScreen.tsx's stats bar.
function formatArrivalTime(minutesFromNow: number): string {
  const arrival = new Date(Date.now() + minutesFromNow * 60_000);
  let hours = arrival.getHours();
  const minutes = arrival.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

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
  const [mapReady, setMapReady] = useState(false);
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

  // Layout the floating stack top-to-bottom below the safe area: info card
  // (header row + the travel-mode toggle row), then the trip stats bar --
  // same two-bar design as responder/screens/NavigateScreen.tsx.
  const infoCardTop = insets.top + SPACING.sm;
  const statsBarTop = infoCardTop + 74 + 40 + SPACING.sm;

  // Real (approximate) clearance the two bars need -- this screen has no
  // bottom sheet or side chrome, so bottom/left/right only need small
  // breathing room. Previously this used one top-sized value applied to
  // all four sides, which forced the view more zoomed-out than the route
  // actually needed (the same bug already fixed on the responder Navigate
  // screen).
  const mapFitPadding = useMemo(
    () => ({
      top: statsBarTop + 70 + SPACING.sm,
      bottom: insets.bottom + 40,
      left: SPACING.lg,
      right: SPACING.lg,
    }),
    [statsBarTop, insets.bottom],
  );

  // Fits both endpoints AND every currently-loaded route's full geometry,
  // not just the two endpoints -- otherwise a driving alternative that
  // takes a genuinely different street could extend past the viewport and
  // get visibly clipped, even though its duration pill still renders.
  // Re-runs once `routes` finishes loading, not just once on the map's
  // initial ready event -- routes starts empty (the fetch happens after
  // the map itself is already "ready"), so the very first fit only has the
  // two endpoints to work with; this effect re-fits once real route
  // geometry lands.
  useEffect(() => {
    if (!mapReady || !citizenCoords || !centerCoords) return;
    const allPoints = [citizenCoords, centerCoords, ...routes.flatMap((route) => route.coordinates)];
    mapRef.current?.fitToPoints(allPoints, mapFitPadding);
  }, [mapReady, citizenCoords, centerCoords, routes, mapFitPadding]);

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
          { id: "center", latitude: center.latitude, longitude: center.longitude, color: statusColor, flat: true, pulse: true },
          ...labelMarkers,
        ]}
        userLocation={citizenCoords}
        polylines={polylines}
        onMarkerPress={(id) => {
          const index = routeIndexFromMarkerId(id);
          if (index !== null) setSelectedRouteIndex(index);
        }}
        onReady={() => setMapReady(true)}
      />

      <View style={[styles.topCard, { top: infoCardTop }]}>
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
      </View>

      <View style={[styles.statsBar, { top: statsBarTop }]}>
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Trip Time</Text>
          <Text style={styles.statsValue}>
            {route ? `${route.durationMin} min` : "—"}
          </Text>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Distance</Text>
          <Text style={styles.statsValue}>
            {route ? `${route.distanceKm.toFixed(1)} km` : `${center.distanceKm.toFixed(1)} km`}
          </Text>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Arriving</Text>
          <Text style={styles.statsValue}>
            {route ? formatArrivalTime(route.durationMin) : "—"}
          </Text>
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
  statsBar: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    top: 0,
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    ...SHADOW,
  },
  statsCol: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  statsDivider: {
    width: 1,
    backgroundColor: COLORS.borderMuted,
    marginVertical: SPACING.xs,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: COLORS.textTertiary,
    textTransform: "uppercase",
  },
  statsValue: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.tide,
    marginTop: 3,
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
