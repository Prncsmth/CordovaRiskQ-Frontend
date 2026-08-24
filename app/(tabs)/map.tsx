import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
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

type ExpoLocationModule = typeof import("expo-location");

const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

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
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const cameraRef = useRef<any>(null);
  const hasCenteredOnUser = useRef(false);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [locationDenied, setLocationDenied] = useState(false);
  const [styleUrl, setStyleUrl] = useState<string>(STYLE_OPTIONS[0].url);
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(14);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = Math.min(zoomLevel + 1, MAX_ZOOM);
    cameraRef.current?.zoomTo(next, 300);
    setZoomLevel(next);
  };

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = Math.max(zoomLevel - 1, MIN_ZOOM);
    cameraRef.current?.zoomTo(next, 300);
    setZoomLevel(next);
  };

  if (mapError) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <View style={styles.headerIcon}>
            <Ionicons name="map" size={16} color={COLORS.primary} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>Evacuation Map</Text>
            <Text style={styles.subtitle}>Map is unavailable right now.</Text>
          </View>
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
          <View style={styles.headerIcon}>
            <Ionicons name="map" size={16} color={COLORS.primary} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>Evacuation Map</Text>
            <Text style={styles.subtitle}>Loading map...</Text>
          </View>
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
        <View style={styles.headerIcon}>
          <Ionicons name="map" size={16} color={COLORS.primary} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>Evacuation Map</Text>
          <Text style={styles.subtitle}>
            {locationDenied
              ? "Nearby evacuation centers"
              : "Nearby evacuation centers · live location"}
          </Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          styleURL={styleUrl}
          logoEnabled={false}
          onRegionDidChange={(feature: any) => {
            const nextZoom = feature?.properties?.zoomLevel;
            if (typeof nextZoom === "number") {
              setZoomLevel(nextZoom);
            }
          }}
        >
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
            minZoomLevel={MIN_ZOOM}
            maxZoomLevel={MAX_ZOOM}
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
          <BlurView intensity={60} tint={COLORS.glassTint} style={styles.searchBar}>
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
          </BlurView>

          {barangayResults.length > 0 && (
            <View style={styles.searchResults}>
              {barangayResults.map((barangay) => (
                <Pressable
                  key={barangay.id}
                  onPress={() => handleSelectBarangay(barangay)}
                  style={styles.searchResultRow}
                >
                  <View style={styles.searchResultIcon}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.searchResultText}>{barangay.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View
          style={[
            styles.zoomControls,
            { bottom: insets.bottom + SPACING.lg + 44 + SPACING.sm },
          ]}
        >
          <BlurView intensity={60} tint={COLORS.glassTint} style={styles.zoomBlur}>
            <Pressable
              onPress={handleZoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              style={styles.zoomButton}
              accessibilityLabel="Zoom in"
            >
              <Ionicons
                name="add"
                size={20}
                color={zoomLevel >= MAX_ZOOM ? COLORS.textTertiary : COLORS.text}
              />
            </Pressable>
            <View style={styles.zoomDivider} />
            <Pressable
              onPress={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              style={styles.zoomButton}
              accessibilityLabel="Zoom out"
            >
              <Ionicons
                name="remove"
                size={20}
                color={zoomLevel <= MIN_ZOOM ? COLORS.textTertiary : COLORS.text}
              />
            </Pressable>
          </BlurView>
        </View>

        <Pressable
          onPress={handleLocateMe}
          disabled={isLocating}
          style={[
            styles.locateButtonOuter,
            { bottom: insets.bottom + SPACING.lg },
          ]}
          accessibilityLabel="Locate me"
        >
          <BlurView intensity={60} tint={COLORS.glassTint} style={styles.locateButton}>
            {isLocating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="locate" size={22} color={COLORS.primary} />
            )}
          </BlurView>
        </Pressable>

        <View style={[styles.styleSwitcher, { top: SPACING.md + 56 }]}>
          {STYLE_OPTIONS.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStyleUrl(option.url);
              }}
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

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
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
    borderRadius: RADIUS.full,
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
    overflow: "hidden",
    backgroundColor: COLORS.glassOverlay,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: SPACING.md,
    height: 44,
    ...SHADOW_LG,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    padding: 0,
  },
  searchResults: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingVertical: SPACING.xs,
    ...SHADOW_LG,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchResultIcon: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
  zoomControls: {
    position: "absolute",
    right: SPACING.md,
    width: 44,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOW_LG,
  },
  zoomBlur: {
    backgroundColor: COLORS.glassOverlay,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  zoomButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  locateButtonOuter: {
    position: "absolute",
    right: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    overflow: "hidden",
    ...SHADOW_LG,
  },
  locateButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.glassOverlay,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  styleSwitcher: {
    position: "absolute",
    right: SPACING.md,
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: 4,
    gap: 4,
    ...SHADOW,
  },
  styleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm - 2,
  },
  styleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  styleButtonText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
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
}
