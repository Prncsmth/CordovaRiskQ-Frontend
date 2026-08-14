import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CORDOVA_BARANGAYS,
  CORDOVA_BOUNDS,
  CORDOVA_CENTER,
  type Barangay,
} from "@/constants/cordovaBarangays";
import {
  getEvacuationCenters,
  type EvacuationCenter,
} from "@/services/evacuation.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

type ExpoLocationModule = typeof import("expo-location");

const STYLE_OPTIONS = [
  { label: "Map", url: "mapbox://styles/mapbox/streets-v11" },
  { label: "Satellite", url: "mapbox://styles/mapbox/satellite-streets-v11" },
  { label: "Terrain", url: "mapbox://styles/mapbox/outdoors-v11" },
] as const;

type MapboxLocation = {
  coords: {
    latitude: number;
    longitude: number;
  };
};

type MapboxModule = {
  default: {
    setAccessToken: (token: string) => void;
  };
  MapView: React.ComponentType<any>;
  Camera: React.ForwardRefExoticComponent<any>;
  MarkerView: React.ComponentType<any>;
  UserLocation: React.ComponentType<any>;
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const hasCenteredOnUser = useRef(false);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [locationDenied, setLocationDenied] = useState(false);
  const [styleUrl, setStyleUrl] = useState<string>(STYLE_OPTIONS[0].url);
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const barangayResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return CORDOVA_BARANGAYS.filter((barangay) =>
      barangay.name.toLowerCase().includes(query),
    ).slice(0, 6);
  }, [searchQuery]);

  useEffect(() => {
    getEvacuationCenters()
      .then(setCenters)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadLocation = async () => {
      try {
        const module = require("expo-location") as ExpoLocationModule;
        const requestFn =
          (module as any).requestForegroundPermissionsAsync ??
          (module as any).default?.requestForegroundPermissionsAsync;

        if (typeof requestFn !== "function") {
          throw new Error("Expo Location request method not available");
        }

        const { status } = await requestFn();
        if (!mounted) return;
        if (status !== "granted") {
          setLocationDenied(true);
        }
      } catch (error) {
        if (!mounted) return;
        console.warn("Failed to load Expo Location", error);
        setLocationDenied(true);
      }
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadMapbox = async () => {
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

        if (!mounted) return;
        setMapbox(mapboxModule as unknown as MapboxModule);
      } catch (error) {
        if (!mounted) return;
        console.warn("Failed to load Mapbox module", error);
        setMapError(
          "Map is unavailable. Please rebuild the app with native Mapbox support.",
        );
      }
    };

    loadMapbox();

    return () => {
      mounted = false;
    };
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

  const handleSelectBarangay = (barangay: Barangay) => {
    Keyboard.dismiss();
    setSearchQuery("");
    cameraRef.current?.setCamera({
      centerCoordinate: [barangay.longitude, barangay.latitude],
      zoomLevel: 16,
      animationDuration: 600,
    });
  };

  const handleLocateMe = async () => {
    try {
      setIsLocating(true);
      const module = require("expo-location") as ExpoLocationModule;
      const requestFn =
        (module as any).requestForegroundPermissionsAsync ??
        (module as any).default?.requestForegroundPermissionsAsync;
      const getCurrentPositionFn =
        (module as any).getCurrentPositionAsync ??
        (module as any).default?.getCurrentPositionAsync;

      if (
        typeof requestFn !== "function" ||
        typeof getCurrentPositionFn !== "function"
      ) {
        throw new Error("Expo Location methods not available");
      }

      const { status } = await requestFn();
      if (status !== "granted") {
        setLocationDenied(true);
        return;
      }

      setLocationDenied(false);
      const position = await getCurrentPositionFn({});
      cameraRef.current?.setCamera({
        centerCoordinate: [
          position.coords.longitude,
          position.coords.latitude,
        ],
        zoomLevel: 16,
        animationDuration: 600,
      });
    } catch (error) {
      console.warn("Failed to locate user", error);
    } finally {
      setIsLocating(false);
    }
  };

  if (mapError) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <Text style={styles.title}>Evacuation Map</Text>
          <Text style={styles.subtitle}>Map is unavailable right now.</Text>
        </View>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>{mapError}</Text>
        </View>
      </View>
    );
  }

  if (!mapbox) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <Text style={styles.title}>Evacuation Map</Text>
          <Text style={styles.subtitle}>Loading map...</Text>
        </View>
        <View style={styles.fallbackContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  const { MapView, Camera, MarkerView, UserLocation } = mapbox;

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
              centerCoordinate: [
                CORDOVA_CENTER.longitude,
                CORDOVA_CENTER.latitude,
              ],
              zoomLevel: 14,
            }}
            maxBounds={CORDOVA_BOUNDS}
            minZoomLevel={12}
          />

          <UserLocation
            visible
            showsUserHeadingIndicator
            onUpdate={handleUserLocationUpdate}
          />

          {centers.map((center) => (
            <MarkerView
              key={center.id}
              coordinate={[center.longitude, center.latitude]}
            >
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

        <View style={[styles.searchContainer, { top: SPACING.md }]}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search barangay..."
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                hitSlop={8}
                onPress={() => setSearchQuery("")}
                accessibilityLabel="Clear search"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            )}
          </View>

          {barangayResults.length > 0 && (
            <View style={styles.searchResults}>
              {barangayResults.map((barangay) => (
                <Pressable
                  key={barangay.id}
                  onPress={() => handleSelectBarangay(barangay)}
                  style={styles.searchResultRow}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.searchResultText}>{barangay.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={handleLocateMe}
          disabled={isLocating}
          style={[
            styles.locateButton,
            { bottom: insets.bottom + SPACING.lg },
          ]}
          accessibilityLabel="Locate me"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="locate" size={22} color={COLORS.primary} />
          )}
        </Pressable>

        <View style={[styles.styleSwitcher, { top: SPACING.md + 56 }]}>
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
  searchContainer: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 44,
    shadowColor: COLORS.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    padding: 0,
  },
  searchResults: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SPACING.xs,
    shadowColor: COLORS.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchResultText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
  locateButton: {
    position: "absolute",
    right: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
  fallbackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  fallbackText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    textAlign: "center",
  },
});
