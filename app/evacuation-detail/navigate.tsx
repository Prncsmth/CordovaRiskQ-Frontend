// app/evacuation-detail/navigate.tsx
// Full-screen route preview, opened from the "View Route" button on an
// evacuation center's detail screen. Shows the real route from the
// citizen's current location to the center (via useRoutes()/directions.service.ts,
// falling back to a straight line while loading or on failure), with a
// walking/driving toggle and route alternatives when Mapbox returns more
// than one. This is a quick in-app glance, not turn-by-turn navigation.
//
// The citizen's position is live (hooks/useLiveCoordinates.ts), and the
// route follows them as they travel: it's re-requested from where they are
// once they're ~30 m from where the current route starts and 10 s have
// passed (hooks/useRouteOrigin.ts) -- not on every GPS update. Straying off
// the route is covered by the same rule: the route passes through its own
// starting point, so being more than ~30 m off it means having moved more
// than ~30 m from that point. A failed recalculation keeps the last route
// and says so (hooks/useRoutes.ts).
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
import type { TravelProfile } from "@/services/directions.service";
import { useLiveCoordinates } from "@/hooks/useLiveCoordinates";
import { useRouteOrigin } from "@/hooks/useRouteOrigin";
import { useRoutesWithStatus } from "@/hooks/useRoutes";
import { routeTargetKey } from "@/utils/routeRequests";
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
  const { coords: citizenCoords, resolved: locationResolved } = useLiveCoordinates();
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const mapRef = useRef<MapHandle>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState<TravelProfile>("walking");
  const centerLat = center?.latitude;
  const centerLng = center?.longitude;
  const centerCoords = useMemo(
    () =>
      centerLat !== undefined && centerLng !== undefined
        ? { latitude: centerLat, longitude: centerLng }
        : undefined,
    [centerLat, centerLng],
  );
  // The destination is always this screen's center (the route id); only the
  // starting point moves with the citizen.
  const routeOrigin = useRouteOrigin(citizenCoords, id);
  const { routes, status: routeStatus } = useRoutesWithStatus(routeOrigin, centerCoords, mode);

  // The picked alternative survives a recalculation (clamped if the new set
  // has fewer routes); switching travel mode goes back to the fastest one.
  // Same choice-per-mode pattern as hooks/useIncidentRoute.ts.
  const [choice, setChoice] = useState<{ mode: TravelProfile; index: number }>({ mode, index: 0 });
  const chosenIndex = choice.mode === mode ? choice.index : 0;
  const selectedRouteIndex = chosenIndex < routes.length ? chosenIndex : 0;

  const route = routes[selectedRouteIndex] ?? null;

  const loadData = useCallback(() => {
    if (!id || !token) return;
    setIsLoading(true);
    setLoadFailed(false);
    // Only the center is fetched here -- the citizen's position comes from
    // the live location stream (useLiveCoordinates). A failure here is
    // therefore a real getEvacuationCenterById failure, kept distinct from
    // "location unavailable" (same split as the responder Navigate screen).
    getEvacuationCenterById(token, id)
      .then((centerData) => setCenter(centerData))
      .catch(() => setLoadFailed(true))
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
  //
  // Fitted once with the two endpoints and once more when the trip's first
  // route lands -- per destination+mode -- not on every live GPS update or
  // recalculated route, which would keep yanking the camera while the
  // citizen is moving or panning around.
  const fittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mapReady || !citizenCoords || !centerCoords) return;
    const target = routeTargetKey(centerCoords, mode);
    const stage = routes.length > 0 ? `${target}|routes` : `${target}|endpoints`;
    if (fittedRef.current === stage) return;
    // Already fitted to this trip's real route: a later failure (routes
    // gone) mustn't zoom back out to the bare endpoints.
    if (routes.length === 0 && fittedRef.current === `${target}|routes`) return;
    fittedRef.current = stage;
    const allPoints = [citizenCoords, centerCoords, ...routes.flatMap((route) => route.coordinates)];
    mapRef.current?.fitToPoints(allPoints, mapFitPadding);
  }, [mapReady, citizenCoords, centerCoords, routes, mode, mapFitPadding]);

  if (isLoading || !locationResolved) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (loadFailed) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Text style={styles.fallbackText}>
          Couldn&apos;t load this evacuation center. Check your connection.
        </Text>
        <Pressable onPress={loadData} style={styles.fallbackRetry}>
          <Text style={styles.fallbackRetryText}>Retry</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
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
          if (index !== null) setChoice({ mode, index });
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

      {/* A failed (re)calculation is said out loud: either the shown route
          is the last one found, or there's no road route and the line is
          only a straight direction guide -- never presented as current. */}
      {routeStatus === "failed" && (
        <View style={[styles.routeNotice, { top: statsBarTop + 56 }]}>
          <Ionicons name="alert-circle" size={14} color={COLORS.textSecondary} />
          <Text style={styles.routeNoticeText}>
            {routes.length > 0
              ? "Couldn't update the route. Showing the last route found."
              : "Road route unavailable. The line only shows the direction."}
          </Text>
        </View>
      )}
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
  routeNotice: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    ...SHADOW,
  },
  routeNoticeText: {
    flex: 1,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
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
