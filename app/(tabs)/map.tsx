import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap, {
    type MapHandle,
    type MapMarker,
    type MapUserLocation,
} from "@/components/map/AppMap";
import LocateButton from "@/components/map/LocateButton";
import PinButton from "@/components/map/PinButton";
import SearchBar from "@/components/map/SearchBar";
import ZoomControls from "@/components/map/ZoomControls";
import MapFirstTimeGuide from "@/components/tour/MapFirstTimeGuide";
import {
    CORDOVA_BARANGAYS,
    CORDOVA_CENTER,
    findNearestBarangay,
    type Barangay,
} from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import * as authStorage from "@/context/authStorage";
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
const MAP_GUIDE_SEEN_KEY = "map_guide_seen_users";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { user } = useAuth();
  const mapRef = useRef<MapHandle>(null);
  const searchTargetRef = useRef<View>(null);
  const pinTargetRef = useRef<View>(null);
  const locateTargetRef = useRef<View>(null);
  const hasCenteredOnUser = useRef(false);
  const { setLocation: setReportLocation } = useReportLocation();
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLocation, setUserLocation] = useState<MapUserLocation | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [pinMode, setPinMode] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showMapGuide, setShowMapGuide] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    authStorage
      .getItem(MAP_GUIDE_SEEN_KEY)
      .then((raw) => {
        const seenUsers = raw ? JSON.parse(raw) : {};
        setShowMapGuide(!seenUsers[user.id]);
      })
      .catch(() => setShowMapGuide(true));
  }, [user?.id]);

  const finishMapGuide = () => {
    if (user?.id) {
      authStorage
        .getItem(MAP_GUIDE_SEEN_KEY)
        .then((raw) => {
          const seenUsers = raw ? JSON.parse(raw) : {};
          return authStorage.setItem(
            MAP_GUIDE_SEEN_KEY,
            JSON.stringify({ ...seenUsers, [user.id]: true }),
          );
        })
        .catch(() => {});
    }
    setShowMapGuide(false);
  };

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
            <BlurView
              intensity={60}
              tint={COLORS.glassTint}
              style={styles.pinHintBlur}
            >
              <Ionicons name="location" size={15} color={COLORS.primary} />
              <Text style={styles.pinHintText}>
                Tap the map to mark the emergency location
              </Text>
            </BlurView>
          </View>
        )}

        <SearchBar
          ref={searchTargetRef}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery("")}
          results={barangayResults}
          onSelectResult={handleSelectBarangay}
        />

        <PinButton
          ref={pinTargetRef}
          active={pinMode}
          onPress={handleTogglePinMode}
          style={{
            bottom:
              insets.bottom + SPACING.lg + 44 + SPACING.sm + 88 + SPACING.sm,
          }}
        />

        <ZoomControls
          zoomLevel={zoomLevel}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          style={{ bottom: insets.bottom + SPACING.lg + 44 + SPACING.sm }}
        />

        <LocateButton
          ref={locateTargetRef}
          isLocating={isLocating}
          onPress={handleLocateMe}
          style={{ bottom: insets.bottom + SPACING.lg }}
        />
      </View>

      {showMapGuide ? (
        <MapFirstTimeGuide
          targetRefs={[searchTargetRef, pinTargetRef, locateTargetRef]}
          onFinish={finishMapGuide}
        />
      ) : null}
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
  });
}
