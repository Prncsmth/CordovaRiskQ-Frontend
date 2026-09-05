import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdvisoryBanner from "@/components/home/AdvisoryBanner";
import GreetingBlock from "@/components/home/GreetingBlock";
import HomeActionList from "@/components/home/HomeActionList";
import HomeHeader from "@/components/home/HomeHeader";
import TideBanner from "@/components/home/TideBanner";
import { SOSButton } from "@/components/sos/SOSButton";
import { getNearestBarangay } from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import { useSos } from "@/context/SosContext";
import { useTour } from "@/context/TourContext";
import { getActiveAnnouncement, type Announcement } from "@/services/advisory.service";
import {
  getEvacuationCenters,
  type EvacuationCenter,
} from "@/services/evacuation.service";
import { getCurrentLocation } from "@/services/location.service";
import { getNotifications } from "@/services/notification.service";
import { getTideStatus, type TideStatus } from "@/services/tide.service";
import { SPACING, useThemeColors, type ColorPalette } from "@/theme";
import { haversineDistanceKm } from "@/utils/distance";
import { formatTime } from "@/utils/formatter";

const FALLBACK_LOCATION = "Barangay Poblacion, Cordova";

const FLOOD_MESSAGE: Record<TideStatus["floodRiskLevel"], string> = {
  normal: "No flood risk detected in your area",
  watch: "Elevated water levels — stay alert",
  warning: "Flood risk in low-lying areas — avoid the causeway",
};

function formatTideDetail(tide: TideStatus): string {
  const seaLevelText = `${tide.seaLevelM.toFixed(1)} m`;
  if (!tide.nextExtremeAt || !tide.nextExtremeType) {
    return seaLevelText;
  }
  const trend = tide.nextExtremeType === "low" ? "falling" : "rising";
  return `${seaLevelText} · ${trend} until ${formatTime(tide.nextExtremeAt)}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { openConfirm } = useSos();
  const { user, token } = useAuth();
  const {
    registerTarget,
    unregisterTarget,
    notifyHomeReady,
    registerScrollContainer,
    unregisterScrollContainer,
    notifyTargetLayout,
  } = useTour();
  const sosAnchorRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const [hasUnread, setHasUnread] = useState(false);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(
    null,
  );
  const [tideStatus, setTideStatus] = useState<TideStatus | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const homeOpacity = useSharedValue(0);
  const homeTranslateY = useSharedValue(18);

  useEffect(() => {
    homeOpacity.value = withTiming(1, { duration: 420 });
    homeTranslateY.value = withTiming(0, { duration: 420 });
  }, [homeOpacity, homeTranslateY]);

  const homeEntranceStyle = useAnimatedStyle(() => ({
    opacity: homeOpacity.value,
    transform: [{ translateY: homeTranslateY.value }],
  }));

  useEffect(() => {
    registerTarget("sos", sosAnchorRef);
    return () => unregisterTarget("sos", sosAnchorRef);
  }, [registerTarget, unregisterTarget]);

  useEffect(() => {
    registerScrollContainer(scrollViewRef);
    return () => unregisterScrollContainer(scrollViewRef);
  }, [registerScrollContainer, unregisterScrollContainer]);

  // Runs once on mount only. notifyHomeReady's identity changes as the
  // persisted-completion map finishes loading in TourContext, but a fresh
  // account's id can never already be in that map -- so the show/hide
  // decision is identical before and after the load resolves, and a single
  // mount-time call is correct. Depending on notifyHomeReady here would
  // risk re-showing (and resetting to step 0) the tour mid-session if the
  // user had already advanced past step 0 by the time it re-fires.
  useEffect(() => {
    notifyHomeReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;

      getNotifications(token)
        .then((notifications) => setHasUnread(notifications.some((n) => !n.read)))
        .catch(() => {});
    }, [token]),
  );

  useEffect(() => {
    getTideStatus()
      .then(setTideStatus)
      .catch(() => {});

    Promise.all([getEvacuationCenters(), getCurrentLocation()])
      .then(([centers, fix]) => {
        let barangayName: string | undefined;
        if (fix) {
          const nearestBarangay = getNearestBarangay(fix.latitude, fix.longitude);
          barangayName = nearestBarangay.name;
          setLocation(`Barangay ${nearestBarangay.name}, Cordova`);
        }

        getActiveAnnouncement(barangayName)
          .then(setAnnouncement)
          .catch(() => {});

        if (centers.length === 0) return;

        const withDistance = fix
          ? centers.map((center) => ({
              ...center,
              distanceKm: haversineDistanceKm(fix, center),
            }))
          : centers;

        const nearest = withDistance.reduce((closest, center) =>
          center.distanceKm < closest.distanceKm ? center : closest,
        );
        setNearestCenter(nearest);
      })
      .catch(() => {});
  }, []);

  const STALE_TIDE_THRESHOLD_MS = 16 * 60 * 60 * 1000; // 2x the backend's 8h poll interval
  const displayTide =
    tideStatus &&
    Date.now() - new Date(tideStatus.updatedAt).getTime() <
      STALE_TIDE_THRESHOLD_MS
      ? tideStatus
      : null;

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      style={[styles.flex, homeEntranceStyle]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.xs },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <HomeHeader hasUnread={hasUnread} />
      <GreetingBlock name={firstName} location={location ?? FALLBACK_LOCATION} />

      <TideBanner
        level={displayTide?.floodRiskLevel ?? null}
        detail={
          displayTide ? formatTideDetail(displayTide) : "Tide data unavailable"
        }
        temperatureC={
          displayTide ? Math.round(displayTide.airTemperatureC) : null
        }
        weatherDescription={displayTide ? displayTide.weatherDescription : null}
        floodMessage={
          displayTide
            ? FLOOD_MESSAGE[displayTide.floodRiskLevel]
            : "Unable to load flood risk data right now"
        }
        updatedLabel={
          displayTide
            ? `Updated ${formatTime(displayTide.updatedAt)}`
            : "Not available"
        }
      />

      {announcement ? (
        <AdvisoryBanner
          priority={announcement.priority}
          time={formatTime(announcement.createdAt)}
          title={announcement.title}
          message={announcement.content}
        />
      ) : null}

      <View
        style={styles.sosSection}
        ref={sosAnchorRef}
        collapsable={false}
        onLayout={notifyTargetLayout}
      >
        <SOSButton onPress={openConfirm} />
      </View>

      <HomeActionList
        nearestCenter={nearestCenter}
        onPressEvacuation={() =>
          nearestCenter && router.push(`/evacuation-detail/${nearestCenter.id}`)
        }
        onPressReport={() => router.push("/(tabs)/report")}
        onPressHotlines={() => router.push("/contacts")}
      />
    </Animated.ScrollView>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.xl,
      gap: SPACING.lg,
    },
    sosSection: {
      marginVertical: SPACING.xs,
    },
  });
}
