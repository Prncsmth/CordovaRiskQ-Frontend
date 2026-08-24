import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
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

type MapboxModule = {
  default: { setAccessToken: (token: string) => void };
  MapView: React.ComponentType<any>;
  Camera: React.ComponentType<any>;
  MarkerView: React.ComponentType<any>;
  ShapeSource: React.ComponentType<any>;
  LineLayer: React.ComponentType<any>;
};

const MAP_HEIGHT = 360;

// Live Mapbox preview of the responder's route to the incident. The line
// drawn is the straight-line path between the two points (no turn-by-turn
// Directions API call) -- good enough to orient a responder at a glance
// without wiring up a routing backend.
export default function IncidentMap({
  responderCoords,
  incidentCoords,
  etaMinutes,
}: {
  responderCoords: Coordinates;
  incidentCoords: Coordinates;
  etaMinutes: number;
}) {
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  useEffect(() => {
    let mounted = true;

    try {
      const module = require("@rnmapbox/maps");
      const mapboxModule = (module as any).default
        ? (module as any).default
        : module;
      const setAccessTokenFn =
        mapboxModule.setAccessToken ??
        (mapboxModule.default?.setAccessToken as unknown);

      if (typeof setAccessTokenFn === "function") {
        setAccessTokenFn(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");
      }

      if (mounted) setMapbox(mapboxModule as unknown as MapboxModule);
    } catch (error) {
      console.warn("Failed to load Mapbox module", error);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const routeShape = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [responderCoords.longitude, responderCoords.latitude],
        [incidentCoords.longitude, incidentCoords.latitude],
      ],
    },
  };

  const lats = [responderCoords.latitude, incidentCoords.latitude];
  const lons = [responderCoords.longitude, incidentCoords.longitude];
  const bounds = {
    ne: [Math.max(...lons), Math.max(...lats)] as [number, number],
    sw: [Math.min(...lons), Math.min(...lats)] as [number, number],
    paddingLeft: 50,
    paddingRight: 50,
    paddingTop: 70,
    paddingBottom: 50,
  };

  return (
    <View style={styles.card}>
      <View style={styles.mapBox}>
        {mapbox ? (
          <mapbox.MapView
            style={styles.map}
            styleURL="mapbox://styles/mapbox/streets-v11"
            logoEnabled={false}
            attributionEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <mapbox.Camera defaultSettings={{ bounds }} />

            <mapbox.ShapeSource id="responderRouteSource" shape={routeShape}>
              <mapbox.LineLayer
                id="responderRouteLine"
                style={{
                  lineColor: COLORS.secondary,
                  lineWidth: 3,
                  lineDasharray: [1.4, 1.4],
                  lineCap: "round",
                }}
              />
            </mapbox.ShapeSource>

            <mapbox.MarkerView
              coordinate={[responderCoords.longitude, responderCoords.latitude]}
            >
              <Image
                source={require("@/assets/images/riskq.png")}
                style={styles.responderLogo}
                resizeMode="contain"
              />
            </mapbox.MarkerView>

            <mapbox.MarkerView
              coordinate={[incidentCoords.longitude, incidentCoords.latitude]}
            >
              <View style={styles.incidentPin}>
                <Ionicons name="location" size={16} color={COLORS.white} />
              </View>
            </mapbox.MarkerView>
          </mapbox.MapView>
        ) : (
          <>
            <PlaceholderThumb style={StyleSheet.absoluteFillObject} />
            <ActivityIndicator color={COLORS.primary} />
          </>
        )}

        <LinearGradient
          colors={[COLORS.secondary, darken(COLORS.secondary, 40)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.etaPill}
        >
          <Ionicons name="time-outline" size={14} color={COLORS.white} />
          <Text style={styles.etaText}>ETA {etaMinutes} mins</Text>
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
  responderLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "transparent",
  },
  incidentPin: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
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
