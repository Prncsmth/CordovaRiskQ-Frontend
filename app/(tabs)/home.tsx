import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdvisoryBanner from "@/components/home/AdvisoryBanner";
import GreetingBlock from "@/components/home/GreetingBlock";
import HomeActionList from "@/components/home/HomeActionList";
import HomeHeader from "@/components/home/HomeHeader";
import TideBanner from "@/components/home/TideBanner";
import { SOSButton } from "@/components/sos/SOSButton";
import { useAuth } from "@/context/AuthContext";
import { useSos } from "@/context/SosContext";
import { getEvacuationCenters, type EvacuationCenter } from "@/services/evacuation.service";
import { getCurrentLocation } from "@/services/location.service";
import { getNotifications } from "@/services/notification.service";
import { getTideStatus, type TideStatus } from "@/services/tide.service";
import { useThemeColors, SPACING, type ColorPalette } from "@/theme";
import { haversineDistanceKm } from "@/utils/distance";
import { formatTime } from "@/utils/formatter";

const MOCK_LOCATION = "Barangay Poblacion, Cordova";
const MOCK_TEMPERATURE_C = 29;
const MOCK_WEATHER_DESCRIPTION = "Partly cloudy";
const MOCK_ADVISORY = {
  signalLabel: "Signal No. 1",
  time: "8:00 AM",
  title: "Tropical Depression Amang nears Cebu",
  message: "Heavy rain and storm surge expected from 6 PM. Prepare go-bags and stay off the causeway.",
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
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const [hasUnread, setHasUnread] = useState(false);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(null);
  const [tideStatus, setTideStatus] = useState<TideStatus | null>(null);

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

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.xs }]}
      showsVerticalScrollIndicator={false}
    >
      <HomeHeader hasUnread={hasUnread} />
      <GreetingBlock name={firstName} location={MOCK_LOCATION} />

      <TideBanner
        level={tideStatus?.floodRiskLevel ?? null}
        detail={tideStatus ? formatTideDetail(tideStatus) : "Tide data unavailable"}
        temperatureC={MOCK_TEMPERATURE_C}
        weatherDescription={MOCK_WEATHER_DESCRIPTION}
        floodMessage={
          tideStatus
            ? FLOOD_MESSAGE[tideStatus.floodRiskLevel]
            : "Unable to load flood risk data right now"
        }
        updatedLabel={tideStatus ? `Updated ${formatTime(tideStatus.updatedAt)}` : "Not available"}
      />

      <AdvisoryBanner
        signalLabel={MOCK_ADVISORY.signalLabel}
        time={MOCK_ADVISORY.time}
        title={MOCK_ADVISORY.title}
        message={MOCK_ADVISORY.message}
        sample
      />

      <View style={styles.sosSection}>
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
    </ScrollView>
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
