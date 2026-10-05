// app/track-responder/[id].tsx
// Full-screen live map for a citizen watching the responder assigned to
// their own report, opened from the "Track Responder" button on
// app/report-detail/[id].tsx. Styled like app/evacuation-detail/navigate.tsx
// (same AppMap + useRoute-based full-screen modal pattern) rather than a new
// map component. Polling and staleness are owned by useResponderTracking;
// this screen only renders whatever state that hook reports.
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import { useAuth } from "@/context/AuthContext";
import { useIncidentRoute } from "@/hooks/useIncidentRoute";
import { locationFreshness, useResponderTracking } from "@/hooks/useResponderTracking";
import { getReportDetailById, type ReportDetail } from "@/services/report.service";
import type { Coordinates } from "@/services/location.service";
import type { ResponderTrack } from "@/services/tracking.service";
import { haversineDistanceKm } from "@/utils/distance";
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
import { respondersHeadline, selectedResponder } from "@/utils/trackResponders";

// Below this, a poll tick's new responder position isn't worth an animated
// recenter -- GPS jitter alone can move a stationary point a few meters.
const RECENTER_THRESHOLD_METERS = 10;

const TRACKABLE_STATUSES = new Set(["assigned", "on_the_way", "arrived"]);

const NO_RESPONDERS: ResponderTrack[] = [];

// Citizen-facing labels for the responder's own per-incident status --
// deliberately separate from getReportStatusDisplay()'s incident-level
// ReportStatus labels used elsewhere in the app. The two usually agree but
// aren't the same field, and this screen prioritizes the responder's live
// operational status if they briefly diverge during a transition.
const ROSTER_STATUS_LABEL: Record<string, string> = {
  joined: "Responder Assigned",
  on_the_way: "Responder En Route",
  arrived: "Responder Arrived",
};

// Compact form for the responder chips when tracking several at once.
const SHORT_STATUS_LABEL: Record<string, string> = {
  joined: "Assigned",
  on_the_way: "En Route",
  arrived: "Arrived",
};

function formatSecondsAgo(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export default function TrackResponderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const mapRef = useRef<MapHandle>(null);

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const hasFitRef = useRef(false);
  const lastCenteredRef = useRef<Coordinates | null>(null);

  const loadReport = useCallback(() => {
    if (!token || !id) return;
    setIsLoading(true);
    setLoadFailed(false);
    getReportDetailById(token, id)
      .then((result) => setReport(result ?? null))
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, [token, id]);

  useEffect(() => {
    // Fetching on mount/id change is the effect's whole job here -- same
    // justification as ResponderAlertContext's poll-trigger effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport();
  }, [loadReport]);

  // Memoized so this stays referentially stable across renders where `report`
  // hasn't changed -- otherwise the object literal below is a new reference
  // every render, and the fit/recenter effects that depend on it would fire
  // every render too instead of only when the coordinates actually change.
  const incidentCoords: Coordinates | undefined = useMemo(
    () =>
      report && report.latitude != null && report.longitude != null
        ? { latitude: report.latitude, longitude: report.longitude }
        : undefined,
    [report],
  );

  const canTrack = !!report && TRACKABLE_STATUSES.has(report.status);

  const tracking = useResponderTracking(canTrack ? token : null, canTrack ? id : undefined);

  // Everyone helping, first-accepted first. The map focuses on one of them
  // at a time (route, ETA, freshness): the one tapped in the list or on the
  // map, defaulting to the first to accept.
  // A shared empty list (not a fresh [] each render), so the memoized
  // markers below stay put while there's no snapshot yet.
  const responders = tracking.kind === "live" ? tracking.snapshot.responders : NO_RESPONDERS;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedResponder(responders, selectedId);
  const responderCoords = selected?.location ?? undefined;

  // Keyed by the selected responder, so switching responders routes from
  // the new one immediately; otherwise the route only follows a moving
  // responder every ~30 m / 10 s (see useIncidentRoute).
  const { route, durationMin, distanceKm } = useIncidentRoute(
    responderCoords,
    incidentCoords,
    selected?.etaMinutes ?? undefined,
    undefined,
    "driving",
    selected?.responderId,
  );

  // One marker per responder with a known location, keyed by their stable
  // responder ID: RiskQ-red with a vehicle/walking symbol, the selected one
  // emphasized. No names on the map -- they're in the chips above. Memoized
  // on the data it's built from, so the 1 s freshness clock doesn't rebuild
  // it (and AppMap, being memoized, doesn't re-render for that clock).
  const movement = tracking.kind === "live" ? tracking.movement : undefined;
  const markers = useMemo(() => {
    if (!incidentCoords) return [];
    const selectedResponderId = selectedResponder(responders, selectedId)?.responderId;
    return [
      { id: "incident", latitude: incidentCoords.latitude, longitude: incidentCoords.longitude, color: COLORS.primary },
      ...responders.flatMap((r) =>
        r.location
          ? [
              {
                id: `responder:${r.responderId}`,
                latitude: r.location.latitude,
                longitude: r.location.longitude,
                color: COLORS.primary,
                icon: "responder" as const,
                movement: movement?.[r.responderId] ?? ("vehicle" as const),
                selected: r.responderId === selectedResponderId,
                label: `${r.responderName}, ${movement?.[r.responderId] === "walking" ? "walking" : "driving"}`,
              },
            ]
          : [],
      ),
    ];
  }, [incidentCoords, responders, movement, selectedId, COLORS]);

  const polylines = useMemo(() => {
    const from = selectedResponder(responders, selectedId)?.location;
    if (!from || !incidentCoords) return [];
    return [
      {
        points: route ? route.coordinates : [from, incidentCoords],
        color: COLORS.secondary,
        dashed: !route,
        weight: 4,
      },
    ];
  }, [responders, selectedId, incidentCoords, route, COLORS]);

  const selectResponder = useCallback((responderId: string) => {
    setSelectedId(responderId);
    // Forces the recenter effect below to fly to the newly selected
    // responder even if they haven't moved.
    lastCenteredRef.current = null;
  }, []);

  const handleMarkerPress = useCallback(
    (markerId: string) => {
      if (markerId.startsWith("responder:")) {
        selectResponder(markerId.slice("responder:".length));
      }
    },
    [selectResponder],
  );
  const handleMapReady = useCallback(() => setMapReady(true), []);

  // One-time bounds fit the moment the incident and at least one responder
  // location are known -- fitting every responder on the map, not on every
  // poll tick, so the map doesn't keep re-zooming as updates arrive.
  const responderPoints = responders.flatMap((r) => (r.location ? [r.location] : []));
  useEffect(() => {
    if (!mapReady || hasFitRef.current) return;
    if (!incidentCoords || responderPoints.length === 0) return;

    mapRef.current?.fitToPoints([...responderPoints, incidentCoords], insets.top + 160);
    hasFitRef.current = true;
    lastCenteredRef.current = responderCoords ?? null;
  }, [mapReady, incidentCoords, responderPoints, responderCoords, insets.top]);

  // After the initial fit, smoothly recenter on the responder<->incident
  // midpoint instead of re-fitting bounds -- but only once the responder has
  // actually moved meaningfully, so GPS jitter doesn't cause a camera nudge
  // on every 4s tick.
  useEffect(() => {
    if (!hasFitRef.current || !responderCoords || !incidentCoords) return;

    const movedMeters = lastCenteredRef.current
      ? haversineDistanceKm(lastCenteredRef.current, responderCoords) * 1000
      : Infinity;
    if (movedMeters < RECENTER_THRESHOLD_METERS) return;

    const midpoint = {
      latitude: (responderCoords.latitude + incidentCoords.latitude) / 2,
      longitude: (responderCoords.longitude + incidentCoords.longitude) / 2,
    };
    mapRef.current?.flyTo(midpoint.latitude, midpoint.longitude);
    lastCenteredRef.current = responderCoords;
  }, [responderCoords, incidentCoords]);

  if (isLoading) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (loadFailed) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Text style={styles.fallbackText}>Couldn&apos;t load this report. Check your connection.</Text>
        <Pressable onPress={loadReport} style={styles.fallbackRetry}>
          <Text style={styles.fallbackRetryText}>Retry</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (!report || !incidentCoords || !canTrack) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Ionicons name="navigate-outline" size={28} color={COLORS.textTertiary} />
        <Text style={styles.fallbackText}>Tracking isn&apos;t available for this report.</Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (tracking.kind === "ended" || tracking.kind === "forbidden") {
    const message =
      tracking.kind === "ended"
        ? "This incident is no longer active. Tracking has ended."
        : "You don't have access to track this incident.";
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Ionicons name="checkmark-circle-outline" size={28} color={COLORS.textTertiary} />
        <Text style={styles.fallbackText}>{message}</Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const isMultiple = responders.length >= 2;
  const freshness =
    tracking.kind === "live" && selected
      ? locationFreshness(selected.locationUpdatedAt, tracking.now)
      : null;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false, presentation: "fullScreenModal" }} />

      <AppMap
        ref={mapRef}
        style={styles.map}
        center={responderCoords ?? incidentCoords}
        zoom={14}
        showLayerSwitcher
        markers={markers}
        polylines={polylines}
        onMarkerPress={handleMarkerPress}
        onReady={handleMapReady}
      />

      <View style={[styles.topCard, { top: insets.top + SPACING.sm }]}>
        <View style={styles.topCardHeader}>
          <View style={[styles.infoIcon, { backgroundColor: COLORS.secondary }]}>
            <Ionicons name="navigate" size={16} color={COLORS.white} />
          </View>
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle} numberOfLines={1}>
              {tracking.kind !== "live" || !selected
                ? "Finding responder…"
                : isMultiple
                  ? respondersHeadline(responders.map((r) => r.status))
                  : selected.responderName}
            </Text>
            <Text style={styles.infoSubtitle} numberOfLines={1}>
              {tracking.kind === "live" && selected
                ? isMultiple
                  ? `${selected.responderName} · ${ROSTER_STATUS_LABEL[selected.status] ?? "Responding"}`
                  : ROSTER_STATUS_LABEL[selected.status] ?? "Responding"
                : report.location}
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        {tracking.kind === "waiting" && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={COLORS.tide} />
            <Text style={styles.statusText}>Waiting for a responder to accept…</Text>
          </View>
        )}

        {tracking.kind === "live" && isMultiple && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.responderList}
            style={styles.responderListScroll}
          >
            {responders.map((r) => {
              const isSelected = r.responderId === selected?.responderId;
              return (
                <Pressable
                  key={r.responderId}
                  onPress={() => selectResponder(r.responderId)}
                  style={[styles.responderChip, isSelected && styles.responderChipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${r.responderName}, ${ROSTER_STATUS_LABEL[r.status] ?? "Responding"}`}
                >
                  <Ionicons
                    name={
                      !r.location ? "time-outline" : movement?.[r.responderId] === "walking" ? "walk" : "car"
                    }
                    size={12}
                    color={isSelected ? COLORS.white : COLORS.secondary}
                  />
                  <Text
                    style={[styles.responderChipText, isSelected && styles.responderChipTextSelected]}
                    numberOfLines={1}
                  >
                    {r.responderName} · {SHORT_STATUS_LABEL[r.status] ?? "Responding"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {tracking.kind === "live" && selected && freshness && (
          <View style={styles.statRow}>
            <View style={styles.statChip}>
              <Ionicons name="time-outline" size={14} color={COLORS.tide} />
              <Text style={styles.statChipText}>
                {selected.status === "arrived"
                  ? "Arrived"
                  : selected.location
                    ? `${durationMin} min`
                    : "No location yet"}
              </Text>
            </View>
            {distanceKm != null && (
              <View style={styles.statChip}>
                <Ionicons name="map-outline" size={14} color={COLORS.tide} />
                <Text style={styles.statChipText}>{distanceKm.toFixed(1)} km</Text>
              </View>
            )}
            {selected.location && (
              <View style={[styles.statChip, freshness.veryStale && styles.statChipMuted]}>
                <Ionicons
                  name={freshness.veryStale ? "alert-circle-outline" : "radio-outline"}
                  size={14}
                  color={freshness.veryStale ? COLORS.textTertiary : COLORS.tide}
                />
                <Text style={[styles.statChipText, freshness.veryStale && styles.statChipTextMuted]}>
                  {freshness.veryStale
                    ? "Last known location"
                    : freshness.stale
                      ? "Updating location…"
                      : freshness.secondsSinceUpdate != null
                        ? `Updated ${formatSecondsAgo(freshness.secondsSinceUpdate)}`
                        : "Live"}
                </Text>
              </View>
            )}
          </View>
        )}
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
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      marginTop: SPACING.sm,
    },
    statusText: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
    },
    statRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.xs,
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
    responderListScroll: {
      marginTop: SPACING.sm,
      marginHorizontal: -SPACING.md,
    },
    responderList: {
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
    },
    responderChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      maxWidth: 200,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
    },
    responderChipSelected: {
      backgroundColor: COLORS.secondary,
      borderColor: COLORS.secondary,
    },
    responderChipText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.text,
      flexShrink: 1,
    },
    responderChipTextSelected: {
      color: COLORS.white,
    },
    statChipMuted: {
      backgroundColor: COLORS.borderMuted,
    },
    statChipText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.tide,
    },
    statChipTextMuted: {
      color: COLORS.textTertiary,
    },
    fallbackScreen: {
      flex: 1,
      backgroundColor: COLORS.background,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.md,
      paddingHorizontal: SPACING.lg,
    },
    fallbackText: {
      color: COLORS.textTertiary,
      fontSize: TYPOGRAPHY.body,
      textAlign: "center",
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
