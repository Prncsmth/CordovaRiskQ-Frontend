import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EvacuationCenterCard from "@/components/home/EvacuationCenterCard";
import GreetingBlock from "@/components/home/GreetingBlock";
import HomeHeader from "@/components/home/HomeHeader";
import QuickActionsRow from "@/components/home/QuickActionsRow";
import SafetyTipsList from "@/components/home/SafetyTipsList";
import TideBanner from "@/components/home/TideBanner";
import { SOSButton } from "@/components/sos/SOSButton";
import { useSos } from "@/context/SosContext";
import { getEvacuationCenters, type EvacuationCenter } from "@/services/evacuation.service";
import { getCurrentLocation } from "@/services/location.service";
import { getNotifications } from "@/services/notification.service";
import { COLORS, FONT_FAMILY, SPACING, TYPOGRAPHY } from "@/theme";
import { haversineDistanceKm } from "@/utils/distance";

const MOCK_NAME = "Carl";
const MOCK_LOCATION = "Barangay Poblacion, Cordova";
const MOCK_TEMPERATURE_C = 29;  
const MOCK_WEATHER_DESCRIPTION = "Partly Cloudy";
const MOCK_TIDE = {
  level: "normal",
  message: "No flooding risk detected in your area.",
} as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { openConfirm } = useSos();
  const [hasUnread, setHasUnread] = useState(false);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(null);

  useEffect(() => {
    getNotifications()
      .then((notifications) => setHasUnread(notifications.length > 0))
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
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <HomeHeader hasUnread={hasUnread} />

      <View style={styles.section}>
        <GreetingBlock
          name={MOCK_NAME}
          location={MOCK_LOCATION}
          temperatureC={MOCK_TEMPERATURE_C}
          weatherDescription={MOCK_WEATHER_DESCRIPTION}
        />
      </View>

      <View style={styles.section}>
        <TideBanner level={MOCK_TIDE.level} message={MOCK_TIDE.message} />
      </View>

      <View style={styles.sosSection}>
        <SOSButton onPress={openConfirm} />
      </View>

      <View style={styles.section}>
        <QuickActionsRow />
      </View>

      {nearestCenter ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Nearest Evacuation Center</Text>
          <EvacuationCenterCard center={nearestCenter} />
        </View>
      ) : null}

      <View style={styles.section}>
        <SafetyTipsList />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  section: {
    gap: SPACING.xs,
  },
  sectionHeading: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sosSection: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
});
