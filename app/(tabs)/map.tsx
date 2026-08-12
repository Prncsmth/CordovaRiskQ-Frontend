import { Ionicons } from "@expo/vector-icons";
import Mapbox, {
  Camera,
  MapView,
  MarkerView,
  UserLocation,
  type Location as MapboxLocation,
} from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getEvacuationCenters, type EvacuationCenter } from "@/services/evacuation.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

const DEFAULT_CENTER = { latitude: 10.2489, longitude: 123.9506 };

const STYLE_OPTIONS = [
  { label: "Map", url: Mapbox.StyleURL.Street },
  { label: "Satellite", url: Mapbox.StyleURL.SatelliteStreet },
  { label: "Terrain", url: Mapbox.StyleURL.Outdoors },
] as const;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);
  const hasCenteredOnUser = useRef(false);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [locationDenied, setLocationDenied] = useState(false);
  const [styleUrl, setStyleUrl] = useState<string>(STYLE_OPTIONS[0].url);

  useEffect(() => {
    getEvacuationCenters()
      .then(setCenters)
      .catch(() => {});
  }, []);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted") {
        setLocationDenied(true);
      }
    });
  }, []);

  const handleUserLocationUpdate = (location: MapboxLocation) => {
    if (hasCenteredOnUser.current) return;
    hasCenteredOnUser.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: [location.coords.longitude, location.coords.latitude],
      zoomLevel: 15,
      animationDuration: 500,
    });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Text style={styles.title}>Evacuation Map</Text>
        <Text style={styles.subtitle}>
          {locationDenied
            ? "Nearby evacuation centers"
            : "Nearby evacuation centers · live location"}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView style={styles.map} styleURL={styleUrl} logoEnabled={false}>
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
              zoomLevel: 14,
            }}
          />

          <UserLocation visible showsUserHeadingIndicator onUpdate={handleUserLocationUpdate} />

          {centers.map((center) => (
            <MarkerView key={center.id} coordinate={[center.longitude, center.latitude]}>
              <Pressable
                hitSlop={8}
                onPress={() => router.push(`/evacuation-detail/${center.id}`)}
                style={[
                  styles.pin,
                  center.status === "open" ? styles.pinOpen : styles.pinFull,
                ]}
              >
                <Ionicons name="location" size={18} color={COLORS.white} />
              </Pressable>
            </MarkerView>
          ))}
        </MapView>

        <View style={[styles.styleSwitcher, { top: SPACING.md }]}>
          {STYLE_OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => setStyleUrl(option.url)}
              style={[
                styles.styleButton,
                styleUrl === option.url && styles.styleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.styleButtonText,
                  styleUrl === option.url && styles.styleButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  pinOpen: {
    backgroundColor: COLORS.success,
  },
  pinFull: {
    backgroundColor: COLORS.danger,
  },
  styleSwitcher: {
    position: "absolute",
    right: SPACING.md,
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 4,
    gap: 4,
    shadowColor: COLORS.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  styleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  styleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  styleButtonText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  styleButtonTextActive: {
    color: COLORS.white,
  },
});
