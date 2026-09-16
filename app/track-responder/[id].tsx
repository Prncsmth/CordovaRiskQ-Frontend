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
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import { useAuth } from "@/context/AuthContext";
import { useIncidentRoute } from "@/hooks/useIncidentRoute";
import { useResponderTracking } from "@/hooks/useResponderTracking";
import { getReportDetailById, type ReportDetail } from "@/services/report.service";
import type { Coordinates } from "@/services/location.service";
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

// Below this, a poll tick's new responder position isn't worth an animated
// recenter -- GPS jitter alone can move a stationary point a few meters.
const RECENTER_THRESHOLD_METERS = 10;

const TRACKABLE_STATUSES = new Set(["assigned", "on_the_way", "arrived"]);

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
  const responderCoords = tracking.kind === "live" ? tracking.snapshot.location ?? undefined : undefined;

  const { route, durationMin, distanceKm } = useIncidentRoute(
    responderCoords,
    incidentCoords,
    tracking.kind === "live" ? tracking.snapshot.etaMinutes ?? undefined : undefined,
    undefined,
  );

  // One-time bounds fit the moment both points are first known -- not on
  // every poll tick, so the map doesn't keep re-zooming as updates arrive.
  useEffect(() => {
    if (!mapReady || hasFitRef.current) return;
    if (!incidentCoords || !responderCoords) return;

    mapRef.current?.fitToPoints([responderCoords, incidentCoords], insets.top + 160);
    hasFitRef.current = true;
    lastCenteredRef.current = responderCoords;
  }, [mapReady, incidentCoords, responderCoords, insets.top]);

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

  const markers = [
    { id: "incident", latitude: incidentCoords.latitude, longitude: incidentCoords.longitude, color: COLORS.primary },
    ...(responderCoords
      ? [
          {
            id: "responder",
            latitude: responderCoords.latitude,
            longitude: responderCoords.longitude,
            color: COLORS.secondary,
            icon: "logo" as const,
          },
        ]
      : []),
  ];

  const polylines = responderCoords
    ? [
        {
          points: route ? route.coordinates : [responderCoords, incidentCoords],
          color: COLORS.secondary,
          dashed: !route,
          weight: 4,
        },
      ]
    : [];

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
        onReady={() => setMapReady(true)}
      />

      <View style={[styles.topCard, { top: insets.top + SPACING.sm }]}>
        <View style={styles.topCardHeader}>
          <View style={[styles.infoIcon, { backgroundColor: COLORS.secondary }]}>
            <Ionicons name="navigate" size={16} color={COLORS.white} />
          </View>
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle} numberOfLines={1}>
              {tracking.kind === "live" ? tracking.snapshot.responderName : "Finding responder…"}
            </Text>
            <Text style={styles.infoSubtitle} numberOfLines={1}>
              {tracking.kind === "live"
                ? ROSTER_STATUS_LABEL[tracking.snapshot.status] ?? "Responding"
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

        {tracking.kind === "live" && (
          <View style={styles.statRow}>
            <View style={styles.statChip}>
              <Ionicons name="time-outline" size={14} color={COLORS.tide} />
              <Text style={styles.statChipText}>
                {tracking.snapshot.status === "arrived" ? "Arrived" : `${durationMin} min`}
              </Text>
            </View>
            {distanceKm != null && (
              <View style={styles.statChip}>
                <Ionicons name="map-outline" size={14} color={COLORS.tide} />
                <Text style={styles.statChipText}>{distanceKm.toFixed(1)} km</Text>
              </View>
            )}
            <View style={[styles.statChip, tracking.veryStale && styles.statChipMuted]}>
              <Ionicons
                name={tracking.veryStale ? "alert-circle-outline" : "radio-outline"}
                size={14}
                color={tracking.veryStale ? COLORS.textTertiary : COLORS.tide}
              />
              <Text style={[styles.statChipText, tracking.veryStale && styles.statChipTextMuted]}>
                {tracking.veryStale
                  ? "Last known location"
                  : tracking.stale
                    ? "Updating location…"
                    : tracking.secondsSinceUpdate != null
                      ? `Updated ${formatSecondsAgo(tracking.secondsSinceUpdate)}`
                      : "Live"}
              </Text>
            </View>
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
