import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { COLORS, FONT_FAMILY, RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY } from "@/theme";

type PinnedLocationCardProps = {
  address: string;
  latitude: number;
  longitude: number;
};

type MapboxModule = {
  default: { setAccessToken: (token: string) => void };
  MapView: React.ComponentType<any>;
  Camera: React.ComponentType<any>;
  MarkerView: React.ComponentType<any>;
};

const MAP_HEIGHT = 170;

export default function PinnedLocationCard({
  address,
  latitude,
  longitude,
}: PinnedLocationCardProps) {
  const router = useRouter();
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

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/map")}
      style={styles.wrap}
    >
      <View style={styles.mapBox}>
        {mapbox ? (
          <mapbox.MapView
            style={styles.map}
            styleURL="mapbox://styles/mapbox/streets-v11"
            logoEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            attributionEnabled={false}
          >
            <mapbox.Camera
              defaultSettings={{
                centerCoordinate: [longitude, latitude],
                zoomLevel: 15,
              }}
            />
            <mapbox.MarkerView coordinate={[longitude, latitude]}>
              <View style={styles.pin}>
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

        <View style={styles.changeBadge}>
          <Ionicons name="create-outline" size={13} color={COLORS.white} />
          <Text style={styles.changeText}>Change</Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location" size={14} color={COLORS.primary} />
        <Text style={styles.caption}>{address}</Text>
        <View style={styles.autoBadge}>
          <Text style={styles.autoBadgeText}>Auto-detected</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    ...SHADOW_LG,
  },
  mapBox: {
    height: MAP_HEIGHT,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  changeBadge: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(23, 24, 26, 0.72)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  changeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  caption: {
    flex: 1,
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  autoBadge: {
    backgroundColor: COLORS.tideTint,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  autoBadgeText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.tide,
  },
});
