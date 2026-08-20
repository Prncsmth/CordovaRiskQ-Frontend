// app/responder/navigate.tsx
// Full-screen turn-by-turn-style map, opened from the "Navigate" button on
// the On the Way phase. Shows the live route from the responder to the
// citizen's shared incident location (straight-line path -- see the note in
// components/responder/IncidentMap.tsx for why there's no Directions API
// call behind it).
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import { useAuth } from "@/context/AuthContext";
import { getIncidentById } from "@/services/incident.service";
import type { Coordinates } from "@/services/location.service";
import { getCurrentLocation } from "@/services/location.service";
import type { Incident } from "@/types/responder";
import {
    COLORS,
    FONT_FAMILY,
    RADIUS,
    SHADOW_LG,
    SPACING,
    TYPOGRAPHY,
} from "@/theme";

type MapboxModule = {
  default: { setAccessToken: (token: string) => void };
  MapView: React.ComponentType<any>;
  Camera: React.ComponentType<any>;
  MarkerView: React.ComponentType<any>;
  ShapeSource: React.ComponentType<any>;
  LineLayer: React.ComponentType<any>;
};

export default function NavigateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [responderCoords, setResponderCoords] = useState<Coordinates | undefined>();
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    getIncidentById(token, id).then(setIncident);
    getCurrentLocation().then(setResponderCoords).catch(() => {});
  }, [token, id]);

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

  if (!incident || !responderCoords || !incident.incidentCoords) {
    return (
      <View style={styles.fallbackScreen}>
        <Stack.Screen
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
        <Text style={styles.fallbackText}>Location data unavailable.</Text>
        <Pressable onPress={() => router.back()} style={styles.fallbackClose}>
          <Text style={styles.fallbackCloseText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const visual = getIncidentVisual(incident.type);
  const { incidentCoords } = incident;

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
    paddingLeft: 70,
    paddingRight: 70,
    paddingTop: insets.top + 180,
    paddingBottom: 120,
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />

      {mapbox ? (
        <mapbox.MapView
          style={styles.map}
          styleURL="mapbox://styles/mapbox/streets-v11"
          logoEnabled={false}
          attributionEnabled={false}
        >
          <mapbox.Camera defaultSettings={{ bounds }} />

          <mapbox.ShapeSource id="fullRouteSource" shape={routeShape}>
            <mapbox.LineLayer
              id="fullRouteLine"
              style={{
                lineColor: COLORS.secondary,
                lineWidth: 4,
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
            <View
              style={[styles.incidentPin, { backgroundColor: visual.color }]}
            >
              <Ionicons name={visual.icon} size={18} color={COLORS.white} />
            </View>
          </mapbox.MarkerView>
        </mapbox.MapView>
      ) : (
        <View style={styles.mapLoading}>
          <PlaceholderThumb style={StyleSheet.absoluteFillObject} />
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )}

      <View
        style={[
          styles.topCard,
          { top: insets.top + SPACING.sm, borderLeftColor: visual.color },
        ]}
      >
        <View style={styles.topCardHeader}>
          <View style={[styles.infoIcon, { backgroundColor: visual.color }]}>
            <Ionicons name={visual.icon} size={16} color={COLORS.white} />
          </View>
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle} numberOfLines={1}>
              {incident.type}
            </Text>
            <Text style={styles.infoSubtitle} numberOfLines={1}>
              {incident.location}
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statChip}>
            <Ionicons name="time-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.statChipText}>
              {incident.etaMinutes ?? 6} min away
            </Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons
              name="navigate-outline"
              size={14}
              color={COLORS.secondary}
            />
            <Text style={styles.statChipText}>
              {incident.distanceKm != null
                ? `${incident.distanceKm.toFixed(1)} km`
                : "—"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  responderLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "transparent",
  },
  incidentPin: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  topCard: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 3,
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
    alignItems: "center",
    justifyContent: "center",
  },
  statRow: {
    flexDirection: "row",
    gap: SPACING.sm,
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
  statChipText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.tide,
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
