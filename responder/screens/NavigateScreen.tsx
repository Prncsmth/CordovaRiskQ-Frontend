// app/responder/navigate.tsx
// Full-screen turn-by-turn-style map, opened from the "Navigate" button on
// the On the Way phase. Shows the real driving route from the responder to
// the citizen's shared incident location (via useIncidentRoute()/directions.service.ts,
// falling back to a straight line while loading or on failure). Offers
// route alternatives when Mapbox returns more than one.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MapHandle } from "@/components/map/AppMap";
import TravelModeToggle from "@/components/common/TravelModeToggle";
import { darken } from "@/responder/components/shared/colorUtils";
import { getIncidentVisual } from "@/responder/components/shared/incidentVisual";
import LiveIncidentMap from "@/responder/components/shared/LiveIncidentMap";
import RButton from "@/responder/components/shared/RButton";
import { useAuth } from "@/context/AuthContext";
import { useIncidentRoute } from "@/hooks/useIncidentRoute";
import { getIncidentById, updateMyResponderStatus } from "@/responder/services/incident.service";
import type { TravelProfile } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";
import { getCurrentLocation } from "@/services/location.service";
import type { Incident } from "@/responder/types/responder";
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
// remaining drive time, formatted the way a dashboard clock would show it.
function formatArrivalTime(minutesFromNow: number): string {
  const arrival = new Date(Date.now() + minutesFromNow * 60_000);
  let hours = arrival.getHours();
  const minutes = arrival.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export default function NavigateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [responderCoords, setResponderCoords] = useState<Coordinates | undefined>();
  const [isArriving, setIsArriving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const mapRef = useRef<MapHandle>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState<TravelProfile>("driving");
  const { routes, selectedRouteIndex, selectRoute, midpoint, durationMin, distanceKm } = useIncidentRoute(
    responderCoords,
    incident?.incidentCoords,
    incident?.etaMinutes,
    incident?.distanceKm,
    mode,
  );

  const loadData = useCallback(() => {
    if (!token || !id) return;
    setIsLoading(true);
    setLoadFailed(false);
    // getCurrentLocation never rejects (resolves undefined when location is
    // unavailable), so Promise.all only rejects on a real getIncidentById
    // failure -- that's the only case worth a retry.
    Promise.all([getIncidentById(token, id), getCurrentLocation()])
      .then(([incidentData, coords]) => {
        setIncident(incidentData);
        setResponderCoords(coords);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, [token, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Layout the floating stack top-to-bottom below the safe area: incident
  // card (header row + the travel-mode toggle row), then the trip stats
  // bar, then the locate button beside it. Computed here (before the early
  // returns below, alongside every other hook) so the fit-to-bounds effect
  // right after it can use the same padding value regardless of loading
  // state -- hooks can't be called conditionally.
  const infoCardTop = insets.top + SPACING.sm;
  const statsBarTop = infoCardTop + 74 + 40 + SPACING.sm;
  const locateButtonTop = statsBarTop + 58;
  const mapFitPadding = useMemo(
    () => ({
      top: statsBarTop + 70 + SPACING.sm,
      bottom: insets.bottom + 190,
      left: SPACING.lg,
      right: SPACING.lg,
    }),
    [statsBarTop, insets.bottom],
  );

  // Fits both the responder/incident endpoints AND every currently-loaded
  // route's full geometry, not just the two endpoints -- otherwise a route
  // that bulges away from the direct line (e.g. the synthesized
  // walking-detour alternative in directions.service.ts) can extend past
  // the viewport and get visibly clipped, even though its duration pill
  // still renders. Re-runs once `routes` finishes loading, not just once
  // on the map's initial ready event -- routes starts empty (the fetch
  // happens after the map itself is already "ready"), so the very first
  // fit only has the two endpoints to work with; this effect re-fits once
  // real route geometry is available.
  useEffect(() => {
    if (!mapReady || !responderCoords || !incident?.incidentCoords) return;
    const allPoints = [
      responderCoords,
      incident.incidentCoords,
      ...routes.flatMap((route) => route.coordinates),
    ];
    mapRef.current?.fitToPoints(allPoints, mapFitPadding);
  }, [mapReady, responderCoords, incident?.incidentCoords, routes, mapFitPadding]);

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

  if (loadFailed) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Text style={styles.fallbackText}>
          Couldn&apos;t load trip data. Check your connection.
        </Text>
        <RButton
          label="Retry"
          icon="refresh"
          variant="secondary"
          onPress={loadData}
          style={styles.fallbackRetry}
        />
        <Pressable onPress={() => router.dismissTo("/responder")} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (!incident || !responderCoords || !incident.incidentCoords || !midpoint) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Text style={styles.fallbackText}>Location data unavailable.</Text>
        <Pressable onPress={() => router.dismissTo("/responder")} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const visual = getIncidentVisual(incident.type);
  const { incidentCoords } = incident;

  const handleLocate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.flyTo(responderCoords.latitude, responderCoords.longitude, 16);
  };

  const handleShare = () => {
    Share.share({
      message: `I'm on my way to ${incident.type} at ${incident.location} -- ETA ${durationMin} min.`,
    }).catch(() => {});
  };

  const handleArrive = async () => {
    if (!token || isArriving) return;
    setIsArriving(true);
    try {
      await updateMyResponderStatus(token, incident.id, "arrived");
      router.dismissTo({ pathname: "/responder/[id]", params: { id: incident.id } });
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        err instanceof Error ? err.message : "Please try again.",
      );
      setIsArriving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />

      <LiveIncidentMap
        ref={mapRef}
        style={styles.map}
        responderCoords={responderCoords}
        incidentCoords={incidentCoords}
        midpoint={midpoint}
        color={visual.color}
        routes={routes}
        selectedRouteIndex={selectedRouteIndex}
        onSelectRoute={selectRoute}
        onReady={() => setMapReady(true)}
      />

      <View
        style={[styles.topCard, { top: infoCardTop }]}
      >
        <View style={styles.topCardHeader}>
          <LinearGradient
            colors={[visual.color, darken(visual.color, 40)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.infoIcon, { shadowColor: visual.color }]}
          >
            <Ionicons name={visual.icon} size={16} color={COLORS.white} />
          </LinearGradient>
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle} numberOfLines={1}>
              {incident.type}
            </Text>
            <Text style={styles.infoSubtitle} numberOfLines={1}>
              {incident.location}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.dismissTo("/responder");
            }}
            hitSlop={10}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
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
          <Text style={styles.statsValue}>{durationMin} min</Text>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Distance</Text>
          <Text style={styles.statsValue}>
            {distanceKm != null ? `${distanceKm.toFixed(1)} km` : "—"}
          </Text>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsCol}>
          <Text style={styles.statsLabel}>Arriving</Text>
          <Text style={styles.statsValue}>{formatArrivalTime(durationMin)}</Text>
        </View>
      </View>

      <Pressable
        onPress={handleLocate}
        hitSlop={8}
        style={[styles.locateButton, { top: locateButtonTop }]}
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
      >
        <Ionicons name="locate" size={16} color={COLORS.textSecondary} />
      </Pressable>

      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + SPACING.md }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetRow}>
          <LinearGradient
            colors={[visual.color, darken(visual.color, 40)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.infoIcon, { shadowColor: visual.color }]}
          >
            <Ionicons name={visual.icon} size={16} color={COLORS.white} />
          </LinearGradient>
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle} numberOfLines={1}>
              {incident.type}
            </Text>
            <Text style={styles.infoSubtitle} numberOfLines={1}>
              {distanceKm != null
                ? `${distanceKm.toFixed(1)} km remaining · about ${durationMin} min`
                : `About ${durationMin} min away`}
            </Text>
          </View>
        </View>

        <View style={styles.sheetActions}>
          <RButton
            label="Share Trip"
            icon="paper-plane-outline"
            variant="secondary"
            onPress={handleShare}
            style={styles.sheetButton}
          />
          <RButton
            label={isArriving ? "Arriving…" : "Arrive"}
            icon="checkmark"
            variant="success"
            onPress={handleArrive}
            disabled={isArriving}
            style={styles.sheetButton}
          />
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
  modeRow: {
    marginTop: SPACING.sm,
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
  locateButton: {
    position: "absolute",
    right: SPACING.md,
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
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    ...SHADOW_LG,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  sheetActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  sheetButton: {
    flex: 1,
    marginBottom: 0,
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
    width: 160,
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
