import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
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

import AppMap, {
  type MapHandle,
  type MapMarker,
  type MapUserLocation,
} from "@/components/map/AppMap";
import {
  CORDOVA_BARANGAYS,
  CORDOVA_CENTER,
  findNearestBarangay,
  type Barangay,
} from "@/constants/cordovaBarangays";
import { useReportLocation } from "@/context/ReportLocationContext";
import {
  getEvacuationCenters,
  type EvacuationCenter,
} from "@/services/evacuation.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const mapRef = useRef<MapHandle>(null);
  const hasCenteredOnUser = useRef(false);
  const { setLocation: setReportLocation } = useReportLocation();
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLocation, setUserLocation] = useState<MapUserLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [pinMode, setPinMode] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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
    let subscription: { remove: () => void } | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== "granted") {
          setLocationDenied(true);
          return;
        }

        setLocationDenied(false);
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (position: Location.LocationObject) => {
            if (!mounted) return;
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
            if (!hasCenteredOnUser.current) {
              hasCenteredOnUser.current = true;
              mapRef.current?.flyTo(
                position.coords.latitude,
                position.coords.longitude,
                15,
              );
            }
          },
        );
      } catch (error) {
        if (!mounted) return;
        console.warn("Failed to watch location", error);
        setLocationDenied(true);
      }
    };

    startWatching();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  const handleSelectBarangay = (barangay: Barangay) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setSearchQuery("");
    mapRef.current?.flyTo(barangay.latitude, barangay.longitude, 16);
  };

  const handleLocateMe = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        return;
      }

      setLocationDenied(false);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      mapRef.current?.flyTo(
        position.coords.latitude,
        position.coords.longitude,
        16,
      );
    } catch (error) {
      console.warn("Failed to locate user", error);
    } finally {
      setIsLocating(false);
    }
  };

  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.zoomIn();
    setZoomLevel((current) => Math.min(current + 1, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.zoomOut();
    setZoomLevel((current) => Math.max(current - 1, MIN_ZOOM));
  };

  // Pin toggle: tap the icon to enter pin-drop mode, then tap the map --
  // that single tap immediately detects and confirms the emergency location
  // (no separate confirm step) and exits pin mode. Tapping the icon again
  // before tapping the map just cancels out of pin mode.
  const handleTogglePinMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPinMode((v) => !v);
  };

  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    if (!pinMode) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPickedPoint(coords);

    const nearest = findNearestBarangay(coords.latitude, coords.longitude);
    setReportLocation({
      address: `Near Barangay ${nearest.name}, Cordova`,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    setPinMode(false);
  };

  const markers: MapMarker[] = [
    ...centers.map((center) => ({
      id: center.id,
      latitude: center.latitude,
      longitude: center.longitude,
      color: center.status === "open" ? COLORS.success : COLORS.danger,
      label: center.name,
    })),
    ...(pickedPoint
      ? [
          {
            id: "picked-report-location",
            latitude: pickedPoint.latitude,
            longitude: pickedPoint.longitude,
            color: COLORS.primary,
            label: "Emergency location to report",
          },
        ]
      : []),
  ];

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
        <AppMap
          ref={mapRef}
          style={styles.map}
          center={CORDOVA_CENTER}
          zoom={14}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          markers={markers}
          userLocation={locationDenied ? null : userLocation}
          showLayerSwitcher
          onMarkerPress={(id) => {
            if (id === "picked-report-location") return;
            router.push(`/evacuation-detail/${id}`);
          }}
          onMapPress={handleMapPress}
          onRegionChange={(region) => setZoomLevel(region.zoom)}
        />

        {pinMode && (
          <View style={[styles.pinHint, { top: insets.top + SPACING.sm + 60 }]}>
            <BlurView intensity={60} tint={COLORS.glassTint} style={styles.pinHintBlur}>
              <Ionicons name="location" size={15} color={COLORS.primary} />
              <Text style={styles.pinHintText}>
                Tap the map to mark the emergency location
              </Text>
            </BlurView>
          </View>
        )}

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

        <Pressable
          onPress={handleTogglePinMode}
          style={[
            styles.pinButtonOuter,
            {
              bottom:
                insets.bottom + SPACING.lg + 44 + SPACING.sm + 88 + SPACING.sm,
            },
          ]}
          accessibilityLabel={
            pinMode
              ? "Cancel pinning emergency location"
              : "Pin emergency location"
          }
        >
          {pinMode ? (
            <View style={styles.pinButtonActive}>
              <Ionicons name="location" size={22} color={COLORS.white} />
            </View>
          ) : (
            <BlurView intensity={60} tint={COLORS.glassTint} style={styles.pinButton}>
              <Ionicons name="location-outline" size={22} color={COLORS.primary} />
            </BlurView>
          )}
        </Pressable>

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
  searchContainer: {
    // Stops short of the right edge (instead of spanning full width) so it
    // doesn't cover the map's layer switcher control, which sits in the
    // top-right corner of the map itself.
    position: "absolute",
    left: SPACING.md,
    right: 64,
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
  pinHint: {
    position: "absolute",
    left: SPACING.md,
    right: 64,
  },
  pinHintBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    alignSelf: "flex-start",
    overflow: "hidden",
    backgroundColor: COLORS.glassOverlay,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOW_LG,
  },
  pinHintText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.text,
  },
  pinButtonOuter: {
    position: "absolute",
    right: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    overflow: "hidden",
    ...SHADOW_LG,
  },
  pinButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.glassOverlay,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  pinButtonActive: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
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
  });
}
