import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/theme";
import type { Coordinates } from "@/types/responder";

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

        <View style={styles.etaPill}>
          <Ionicons name="time-outline" size={14} color={COLORS.white} />
          <Text style={styles.etaText}>ETA {etaMinutes} mins</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
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
  },
  etaPill: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
  },
  etaText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.small,
  },
});
