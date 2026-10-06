// components/responder/incident-detail/OnTheWayView.tsx
// Phase 3 of the incident-detail flow: a live map from the responder's
// current location to the incident, with a bottom sheet that hands off
// to the full turn-by-turn screen at app/responder/navigate.tsx.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useIsFocused, useRouter } from "expo-router";
import React, { useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MapHandle } from "@/components/map/AppMap";
import { getIncidentVisual } from "@/responder/components/shared/incidentVisual";
import LiveIncidentMap from "@/responder/components/shared/LiveIncidentMap";
import RButton from "@/responder/components/shared/RButton";
import { useIncidentRoute } from "@/hooks/useIncidentRoute";
import { useLiveCoordinates } from "@/hooks/useLiveCoordinates";
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
import type { Incident } from "@/responder/types/responder";

import { darken } from "@/responder/components/shared/colorUtils";
import ReporterContactCard from "./ReporterContactCard";

// Card height (48px row + 2x16px padding) plus its top margin.
const REPORTER_CARD_HEIGHT = 96;

export default function OnTheWayView({
  incident,
  onLeave,
}: {
  incident: Incident;
  onArrive: () => void;
  onLeave: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);
  // Follows the responder from the shared live GPS stream (it used to be
  // read once on mount); the route re-requests only every ~30 m / 10 s
  // (see useIncidentRoute).
  const { coords: responderCoords } = useLiveCoordinates();
  const mapRef = useRef<MapHandle>(null);
  // While the full-screen Navigate map is open on top, this screen is
  // blurred and that map already keeps the route fresh -- pause this one's
  // route requests so the two don't double the Directions API calls. It
  // catches up as soon as the responder comes back here.
  const isFocused = useIsFocused();
  const { route, midpoint, durationMin, distanceKm } = useIncidentRoute(
    responderCoords,
    incident.incidentCoords,
    incident.etaMinutes,
    incident.distanceKm,
    "driving",
    undefined,
    isFocused,
  );

  if (!incident.incidentCoords || !responderCoords || !midpoint) {
    return (
      <View style={styles.mapScreen}>
        <Text style={styles.notFound}>Location data unavailable.</Text>
      </View>
    );
  }

  const { incidentCoords } = incident;

  // Real (approximate) clearance the floating chrome needs on each side --
  // fits both points into the space actually left visible between the
  // locate button up top and the bottom sheet (thumbnail + text + Navigate
  // + Leave Incident), instead of one top-sized value applied to all four
  // sides, which forced the view more zoomed-out than the route needed.
  // The reporter's call card makes the sheet taller when it's shown.
  const mapFitPadding = {
    top: insets.top + 70,
    bottom: insets.bottom + 300 + (incident.reporterContact ? REPORTER_CARD_HEIGHT : 0),
    left: SPACING.lg,
    right: SPACING.lg,
  };

  const handleLocate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.flyTo(responderCoords.latitude, responderCoords.longitude, 16);
  };

  return (
    <View style={styles.mapScreen}>
      <LiveIncidentMap
        ref={mapRef}
        style={styles.map}
        responderCoords={responderCoords}
        incidentCoords={incidentCoords}
        midpoint={midpoint}
        color={visual.color}
        // Deliberately not showing route alternatives here -- this is the
        // compact embedded preview map; picking a route is offered on the
        // full-screen Navigate screen instead.
        routes={route ? [route] : []}
        selectedRouteIndex={0}
        onReady={() =>
          mapRef.current?.fitToPoints(
            [responderCoords, incidentCoords],
            mapFitPadding,
          )
        }
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.dismissTo("/responder");
        }}
        hitSlop={8}
        style={[styles.mapButton, styles.backButton, { top: insets.top + SPACING.sm }]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
      </Pressable>

      <Pressable
        onPress={handleLocate}
        hitSlop={8}
        style={[styles.mapButton, styles.locateButton, { top: insets.top + SPACING.sm }]}
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
      >
        <Ionicons name="locate" size={20} color={COLORS.textSecondary} />
      </Pressable>

      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + SPACING.md }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetContentRow}>
          <View style={styles.thumbnailTile}>
            <LinearGradient
              colors={[visual.color, darken(visual.color, 40)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.thumbnailFill}
            >
              <Ionicons name={visual.icon} size={36} color={COLORS.white} />
            </LinearGradient>
            <View style={styles.thumbnailCaption}>
              <Text style={styles.thumbnailCaptionText}>
                {distanceKm != null ? `${distanceKm.toFixed(1)} km away` : "En route"}
              </Text>
            </View>
          </View>

          <View style={styles.sheetTextCol}>
            <Text style={[styles.categoryLabel, { color: visual.color }]}>
              INCIDENT · {incident.urgency.toUpperCase()}
            </Text>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {incident.type}
            </Text>
            <Text style={styles.sheetDescription} numberOfLines={2}>
              {incident.location}
            </Text>
          </View>
        </View>

        <ReporterContactCard incident={incident} style={styles.reporterCard} />

        <RButton
          label="Navigate"
          icon="navigate"
          variant="primary"
          onPress={() =>
            router.push({
              pathname: "/responder/navigate",
              params: { id: incident.id },
            })
          }
          style={styles.navigateButton}
        />

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLeave();
          }}
          style={({ pressed }) => [styles.leaveButton, pressed && styles.leaveButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Leave incident"
        >
          <Ionicons name="exit-outline" size={18} color={COLORS.danger} />
          <Text style={styles.leaveButtonText}>Leave Incident</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    mapScreen: {
      flex: 1,
      position: "relative",
      backgroundColor: COLORS.surface,
    },
    map: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    notFound: {
      textAlign: "center",
      marginTop: SPACING.xl,
      color: COLORS.textTertiary,
    },
    locateButton: {
      right: SPACING.md,
    },
    backButton: {
      left: SPACING.md,
    },
    mapButton: {
      position: "absolute",
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.background,
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
      marginBottom: SPACING.lg,
    },
    sheetContentRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: SPACING.md,
    },
    thumbnailTile: {
      width: 112,
      height: 120,
      borderRadius: RADIUS.md,
      overflow: "hidden",
    },
    thumbnailFill: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbnailCaption: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    thumbnailCaptionText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.white,
    },
    sheetTextCol: {
      flex: 1,
      minWidth: 0,
      justifyContent: "center",
    },
    categoryLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    sheetTitle: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
      marginTop: 4,
    },
    sheetDescription: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: 6,
    },
    navigateButton: {
      marginTop: SPACING.lg,
      marginBottom: 0,
    },
    reporterCard: {
      marginTop: SPACING.md,
    },
    // Secondary to Navigate: a quiet outline button in the danger tint,
    // same red-on-tint language as the Lobby's "Leave Incident" row.
    leaveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.xs,
      height: 46,
      marginTop: SPACING.sm,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: `${COLORS.danger}40`,
      backgroundColor: `${COLORS.danger}0D`,
    },
    leaveButtonPressed: {
      backgroundColor: `${COLORS.danger}1F`,
    },
    leaveButtonText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.danger,
    },
  });
}
