import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useSos } from "@/context/SosContext";
import { useTour } from "@/context/TourContext";
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

const MOCK_LOCATION = "Barangay Poblacion, Cordova";
const MOCK_ADVISORY = {
  signalLabel: "Signal No. 1",
  time: "8:00 AM",
  title: "Tropical Depression Amang nears Cebu",
  message:
    "Heavy rain and storm surge expected from 6 PM. Prepare go-bags and stay off the causeway.",
};

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
  const { user } = useAuth();
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

  useEffect(() => {
    getNotifications()
      .then((notifications) => setHasUnread(notifications.length > 0))
      .catch(() => {});

    getTideStatus()
      .then(setTideStatus)
      .catch(() => {});

    Promise.all([getEvacuationCenters(), getCurrentLocation()])
      .then(([centers, location]) => {
        if (centers.length === 0) return;

        const withDistance = location
          ? centers.map((center) => ({
              ...center,
              distanceKm: haversineDistanceKm(location, center),
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
      <GreetingBlock name={firstName} location={MOCK_LOCATION} />

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

      <AdvisoryBanner
        signalLabel={MOCK_ADVISORY.signalLabel}
        time={MOCK_ADVISORY.time}
        title={MOCK_ADVISORY.title}
        message={MOCK_ADVISORY.message}
        sample
      />

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
