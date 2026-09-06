// components/responder/incident-detail/OnTheWayView.tsx
// Phase 3 of the incident-detail flow: a live map from the responder's
// current location to the incident, with a bottom sheet that hands off
// to the full turn-by-turn screen at app/responder/navigate.tsx.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import RButton from "@/components/responder/RButton";
import { useRoute } from "@/hooks/useRoute";
import type { Coordinates } from "@/services/location.service";
import { getCurrentLocation } from "@/services/location.service";
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
import type { Incident } from "@/types/responder";

import { darken } from "./colorUtils";

export default function OnTheWayView({
  incident,
}: {
  incident: Incident;
  onArrive: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);
  const [responderCoords, setResponderCoords] = useState<Coordinates | undefined>();
  const mapRef = useRef<MapHandle>(null);
  const route = useRoute(responderCoords, incident.incidentCoords, "driving");

  useEffect(() => {
    getCurrentLocation().then(setResponderCoords).catch(() => {});
  }, []);

  if (!incident.incidentCoords || !responderCoords) {
    return (
      <View style={styles.mapScreen}>
        <Text style={styles.notFound}>Location data unavailable.</Text>
      </View>
    );
  }

  const { incidentCoords } = incident;
  const midpoint = {
    latitude: (responderCoords.latitude + incidentCoords.latitude) / 2,
    longitude: (responderCoords.longitude + incidentCoords.longitude) / 2,
  };
  const durationMin = route?.durationMin ?? incident.etaMinutes ?? 6;
  const distanceKm = route?.distanceKm ?? incident.distanceKm;

  const handleLocate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.flyTo(responderCoords.latitude, responderCoords.longitude, 16);
  };

  return (
    <View style={styles.mapScreen}>
      <AppMap
        ref={mapRef}
        style={styles.map}
        center={midpoint}
        zoom={14}
        showLayerSwitcher
        markers={[
          { id: "responder", ...responderCoords, color: COLORS.secondary, icon: "logo" },
          { id: "incident", ...incidentCoords, color: visual.color },
        ]}
        polylines={[
          {
            points: route ? route.coordinates : [responderCoords, incidentCoords],
            color: COLORS.secondary,
            dashed: false,
            weight: 4,
          },
        ]}
        onReady={() =>
          mapRef.current?.fitToPoints(
            [responderCoords, incidentCoords],
            insets.top + 140,
          )
        }
      />

      <Pressable
        onPress={handleLocate}
        hitSlop={8}
        style={[styles.locateButton, { top: insets.top + SPACING.sm }]}
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
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.dismissTo("/responder");
              }}
              style={styles.backChip}
            >
              <Ionicons name="arrow-back" size={14} color={COLORS.textSecondary} />
              <Text style={styles.backChipText}>Back</Text>
            </Pressable>
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
      position: "absolute",
      right: SPACING.md,
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
      marginBottom: SPACING.md,
    },
    sheetContentRow: {
      flexDirection: "row",
      gap: SPACING.md,
    },
    thumbnailTile: {
      width: 112,
      height: 132,
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
    },
    backChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 5,
      marginBottom: SPACING.sm,
    },
    backChipText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
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
      marginTop: 2,
    },
    sheetDescription: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: 4,
    },
    navigateButton: {
      marginTop: SPACING.md,
      marginBottom: 0,
    },
  });
}
