import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap, {
    type MapHandle,
    type MapMarker,
    type MapUserLocation,
} from "@/components/map/AppMap";
import ConfirmLocationDialog from "@/components/map/ConfirmLocationDialog";
import LocateButton from "@/components/map/LocateButton";
import MapLegend from "@/components/map/MapLegend";
import NearestCenterButton from "@/components/map/NearestCenterButton";
import PinButton from "@/components/map/PinButton";
import SearchBar from "@/components/map/SearchBar";
import ZoomControls from "@/components/map/ZoomControls";
import MapFirstTimeGuide from "@/components/tour/MapFirstTimeGuide";
import GeofenceBlockedModal from "@/components/common/GeofenceBlockedModal";
import GeofenceToast from "@/components/common/GeofenceToast";
import {
    CORDOVA_BARANGAYS,
    CORDOVA_CENTER,
    getNearestBarangay,
    type Barangay,
} from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import * as authStorage from "@/context/authStorage";
import { useEvacuationCenters } from "@/context/EvacuationCenterContext";
import { useReportLocation } from "@/context/ReportLocationContext";
import { reverseGeocode } from "@/services/geocoding.service";
import { getVerifiedLocation } from "@/services/location.service";
import {
    RADIUS,
    SHADOW_LG,
    SPACING,
    TYPOGRAPHY,
    useThemeColors,
    type ColorPalette,
} from "@/theme";
import { isInsideCordova } from "@/utils/geofence";
import { haversineDistanceKm } from "@/utils/distance";

const MIN_ZOOM = 12;
const MAX_ZOOM = 18;
const MAP_GUIDE_SEEN_KEY = "map_guide_seen_users";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const isChangingLocation = intent === "change-location";
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { user } = useAuth();
  const { centers } = useEvacuationCenters();
  const mapRef = useRef<MapHandle>(null);
  const searchTargetRef = useRef<View>(null);
  const pinTargetRef = useRef<View>(null);
  const nearestTargetRef = useRef<View>(null);
  const locateTargetRef = useRef<View>(null);
  const hasCenteredOnUser = useRef(false);
  const pinRequestIdRef = useRef(0);
  const { setLocation: setReportLocation, changeRequestId } = useReportLocation();
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLocation, setUserLocation] = useState<MapUserLocation | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [pinMode, setPinMode] = useState(false);
  const [showNearestOnly, setShowNearestOnly] = useState(false);
  const [pickedPoint, setPickedPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [pendingPoint, setPendingPoint] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [showMapGuide, setShowMapGuide] = useState(false);
  const [showOutsideCordovaToast, setShowOutsideCordovaToast] = useState(false);
  const [pinButtonLoading, setPinButtonLoading] = useState(false);
  const [citizenOutsideCordova, setCitizenOutsideCordova] = useState(false);
  const [showOutsideModal, setShowOutsideModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const outsideStreakRef = useRef(0);
  const wasOutsideRef = useRef(false);
  const pinModeInFlightRef = useRef(false);
  const lastHandledRequestIdRef = useRef(0);

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

            if (isInsideCordova(position.coords.latitude, position.coords.longitude)) {
              outsideStreakRef.current = 0;
              wasOutsideRef.current = false;
              setCitizenOutsideCordova(false);
            } else {
              outsideStreakRef.current += 1;
              if (outsideStreakRef.current >= 2 && !wasOutsideRef.current) {
                wasOutsideRef.current = true;
                setCitizenOutsideCordova(true);
                setShowOutsideModal(true);
                setPinMode(false);
                setPickedPoint(null);
              }
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

  // Same pattern as home.tsx's own nearest-center pick: recompute distance
  // from the citizen's live position rather than trusting each center's own
  // distanceKm, which isn't guaranteed relative to where they actually are
  // right now.
  const nearestCenter = useMemo(() => {
    if (centers.length === 0 || !userLocation) return null;
    return centers.reduce((closest, center) =>
      haversineDistanceKm(userLocation, center) <
      haversineDistanceKm(userLocation, closest)
        ? center
        : closest,
    );
  }, [centers, userLocation]);

  const handleToggleNearest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNearestOnly((prev) => {
      const next = !prev;
      if (next && nearestCenter) {
        mapRef.current?.flyTo(nearestCenter.latitude, nearestCenter.longitude, 16);
      }
      return next;
    });
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
  const handleTogglePinMode = async () => {
    if (pinMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPinMode(false);
      return;
    }

    if (pinModeInFlightRef.current) return;
    pinModeInFlightRef.current = true;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPinButtonLoading(true);
      const result = await getVerifiedLocation();
      setPinButtonLoading(false);

      if (result.status === "denied") {
        setShowPermissionModal(true);
        return;
      }
      if (result.status === "unavailable" || !isInsideCordova(result.coords.latitude, result.coords.longitude)) {
        setCitizenOutsideCordova(true);
        setShowOutsideModal(true);
        return;
      }

      setPinMode(true);
    } finally {
      pinModeInFlightRef.current = false;
    }
  };

  // Arriving here specifically to change an already-set report location (via
  // the Pinned Location card's "Change" button) skips the extra tap on the
  // pin button -- there's nothing left to explain beyond "tap the map",
  // which the hint banner below already covers.
  //
  // useFocusEffect (not a plain useEffect on the route params) because this
  // screen is a persistent tab, never remounted between visits -- and a
  // first attempt keyed on a route param that changed per tap turned out
  // unreliable, since expo-router doesn't reliably re-deliver fresh params
  // to an already-mounted tab screen the way a stack push would.
  // changeRequestId (bumped via ReportLocationContext each time "Change" is
  // tapped, the same cross-tab-context mechanism this file already uses for
  // the location value itself) is what actually distinguishes "the user
  // just tapped Change again" from "this tab merely regained focus" --
  // resetting only on the former means a second (or later) "Change" tap
  // correctly clears stale state from the previous round
  // (pickedPoint/pendingPoint, which handleConfirmLocation only ever clears
  // the latter of) and re-enters pin-drop mode, while simply switching away
  // mid-pick and back leaves an in-progress selection alone.
  useFocusEffect(
    useCallback(() => {
      if (!isChangingLocation || lastHandledRequestIdRef.current === changeRequestId) return;
      lastHandledRequestIdRef.current = changeRequestId;
      setPickedPoint(null);
      setPendingPoint(null);
      handleTogglePinMode();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isChangingLocation, changeRequestId]),
  );

  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    if (!pinMode) return;

    if (!isInsideCordova(coords.latitude, coords.longitude)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowOutsideCordovaToast(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPickedPoint(coords);
    setPinMode(false);

    const nearest = getNearestBarangay(coords.latitude, coords.longitude);
    setPendingPoint({
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: `Near Barangay ${nearest.name}, Cordova`,
    });

    // Upgrade to a full street-level address in the background so a
    // responder knows exactly which part of the barangay to go to -- falls
    // back to (and never regresses below) the barangay-only address above
    // if geocoding is slow, offline, or unavailable. Guarded against a
    // second pin drop landing before this one's geocode resolves.
    const requestId = ++pinRequestIdRef.current;
    reverseGeocode(coords).then((address) => {
      if (!address || pinRequestIdRef.current !== requestId) return;
      setPendingPoint((prev) =>
        prev && prev.latitude === coords.latitude && prev.longitude === coords.longitude
          ? { ...prev, address }
          : prev,
      );
    });
  };

  const handleConfirmLocation = () => {
    if (!pendingPoint) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReportLocation({
      address: pendingPoint.address,
      latitude: pendingPoint.latitude,
      longitude: pendingPoint.longitude,
    });
    setPendingPoint(null);
    router.push("/(tabs)/report");
  };

  const handleChooseAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingPoint(null);
    setPickedPoint(null);
    setPinMode(true);
  };

  const visibleCenters =
    showNearestOnly && nearestCenter ? [nearestCenter] : centers;

  const markers: MapMarker[] = [
    ...visibleCenters.map((center) => ({
      id: center.id,
      latitude: center.latitude,
      longitude: center.longitude,
      color: center.status === "open" ? COLORS.success : COLORS.danger,
      // Plain colored pin icon, no circular background -- less visual
      // weight for a screen that can show many of these at once. The pulse
      // ring (same glow used for a responder's live incidents) is what
      // keeps it from reading as flat/lifeless instead of a border on the
      // icon itself.
      flat: true,
      pulse: true,
      // Spells out the status in the tap-popup text, not just the marker's
      // color -- color alone (the only other status signal) requires
      // opening the collapsed-by-default MapLegend to even know what red
      // means, and doesn't help at all for someone who can't distinguish
      // red from green.
      label: `${center.name} • ${center.status === "open" ? "Open" : "Full"}`,
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
          showCordovaBoundary
          topInset={insets.top}
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
                {isChangingLocation
                  ? "Tap your exact location on the map to update it"
                  : "Tap the map to mark the emergency location"}
              </Text>
            </BlurView>
          </View>
        )}

        <GeofenceToast
          visible={showOutsideCordovaToast}
          message="Outside Cordova — Please select a location within Cordova."
          onDismiss={() => setShowOutsideCordovaToast(false)}
          style={{
            bottom:
              insets.bottom +
              SPACING.lg +
              44 +
              SPACING.sm +
              88 +
              SPACING.sm +
              44 +
              SPACING.sm +
              44 +
              SPACING.sm,
          }}
        />

        <SearchBar
          ref={searchTargetRef}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery("")}
          results={barangayResults}
          onSelectResult={handleSelectBarangay}
          style={{ top: insets.top + SPACING.sm }}
        />

        <PinButton
          ref={pinTargetRef}
          active={pinMode}
          loading={pinButtonLoading}
          disabled={citizenOutsideCordova}
          onPress={handleTogglePinMode}
          style={{
            bottom:
              insets.bottom + SPACING.lg + 44 + SPACING.sm + 88 + SPACING.sm,
          }}
        />

        <NearestCenterButton
          ref={nearestTargetRef}
          active={showNearestOnly}
          disabled={!nearestCenter}
          onPress={handleToggleNearest}
          style={{
            bottom:
              insets.bottom +
              SPACING.lg +
              44 +
              SPACING.sm +
              88 +
              SPACING.sm +
              44 +
              SPACING.sm,
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

        <MapLegend style={{ left: SPACING.md, bottom: insets.bottom + SPACING.lg }} />
      </View>

      {showMapGuide ? (
        <MapFirstTimeGuide
          targetRefs={[
            searchTargetRef,
            pinTargetRef,
            nearestTargetRef,
            locateTargetRef,
          ]}
          onFinish={finishMapGuide}
        />
      ) : null}

      <GeofenceBlockedModal
        visible={showOutsideModal}
        variant="reporting-unavailable"
        onDismiss={() => setShowOutsideModal(false)}
      />

      <GeofenceBlockedModal
        visible={showPermissionModal}
        variant="permission-required"
        onDismiss={() => setShowPermissionModal(false)}
        onRetry={() => {
          setShowPermissionModal(false);
          handleTogglePinMode();
        }}
      />

      {pendingPoint && (
        <ConfirmLocationDialog
          address={pendingPoint.address}
          onConfirm={handleConfirmLocation}
          onChooseAgain={handleChooseAgain}
        />
      )}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: COLORS.background,
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
