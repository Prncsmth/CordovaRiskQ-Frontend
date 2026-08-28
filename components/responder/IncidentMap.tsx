import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import { useRoute } from "@/hooks/useRoute";
import {
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Coordinates } from "@/types/responder";

// Hand-picked darker shade of a theme color, used as the second gradient
// stop on the ETA pill so it stays a solid, high-contrast capsule (rather
// than a flat tint) in both light and dark mode -- mirrors the
// primary/primaryDark two-tone pattern used elsewhere in the app.
function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const MAP_HEIGHT = 360;

// Live map preview of the responder's route to the incident. Draws the real
// driving route via useRoute()/directions.service.ts (Mapbox Directions),
// falling back to a straight line between the two points while the route is
// loading or if the request fails.
export default function IncidentMap({
  responderCoords,
  incidentCoords,
  etaMinutes,
}: {
  responderCoords: Coordinates;
  incidentCoords: Coordinates;
  etaMinutes: number;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const mapRef = useRef<MapHandle>(null);
  const route = useRoute(responderCoords, incidentCoords, "driving");

  const midpoint = {
    latitude: (responderCoords.latitude + incidentCoords.latitude) / 2,
    longitude: (responderCoords.longitude + incidentCoords.longitude) / 2,
  };

  return (
    <View style={styles.card}>
      <View style={styles.mapBox}>
        <AppMap
          ref={mapRef}
          style={styles.map}
          center={midpoint}
          zoom={14}
          interactive={false}
          showLayerSwitcher={false}
          markers={[
            { id: "responder", ...responderCoords, color: COLORS.secondary, icon: "logo" },
            { id: "incident", ...incidentCoords, color: COLORS.primary },
          ]}
          polylines={[
            {
              points: route ? route.coordinates : [responderCoords, incidentCoords],
              color: COLORS.secondary,
              dashed: false,
              weight: 3,
            },
          ]}
          onReady={() =>
            mapRef.current?.fitToPoints([responderCoords, incidentCoords], 60)
          }
        />

        <LinearGradient
          colors={[COLORS.secondary, darken(COLORS.secondary, 40)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.etaPill}
        >
          <Ionicons name="time-outline" size={14} color={COLORS.white} />
          <Text style={styles.etaText}>
            {route ? `${route.durationMin} min drive` : `ETA ${etaMinutes} mins`}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: 0,
    marginVertical: SPACING.md,
    overflow: "hidden",
    ...SHADOW,
  },
  mapBox: {
    flex: 1,
    minHeight: MAP_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  etaPill: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  etaText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.small,
  },
  });
}
