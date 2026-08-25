import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import EvacuationCenterCard from "@/components/home/EvacuationCenterCard";
import HomeHero from "@/components/home/HomeHero";
import QuickActionsRow from "@/components/home/QuickActionsRow";
import SafetyTipsList from "@/components/home/SafetyTipsList";
import { SOSButton } from "@/components/sos/SOSButton";
import { useAuth } from "@/context/AuthContext";
import { useSos } from "@/context/SosContext";
import { getEvacuationCenters, type EvacuationCenter } from "@/services/evacuation.service";
import { getNotifications } from "@/services/notification.service";
import { useThemeColors, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

const MOCK_LOCATION = "Barangay Poblacion, Cordova";
const MOCK_TEMPERATURE_C = 29;
const MOCK_WEATHER_DESCRIPTION = "Partly Cloudy";
const MOCK_TIDE = {
  level: "normal",
  message: "No flooding risk detected in your area.",
} as const;

export default function HomeScreen() {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { openConfirm } = useSos();
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const [hasUnread, setHasUnread] = useState(false);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(null);

  useEffect(() => {
    getNotifications()
      .then((notifications) => setHasUnread(notifications.length > 0))
      .catch(() => {});

    getEvacuationCenters()
      .then((centers) => {
        if (centers.length === 0) return;
        const nearest = centers.reduce((closest, center) =>
          center.distanceKm < closest.distanceKm ? center : closest,
        );
        setNearestCenter(nearest);
      })
      .catch(() => {});
  }, []);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <HomeHero
        hasUnread={hasUnread}
        name={firstName}
        location={MOCK_LOCATION}
        temperatureC={MOCK_TEMPERATURE_C}
        weatherDescription={MOCK_WEATHER_DESCRIPTION}
        tideLevel={MOCK_TIDE.level}
        tideMessage={MOCK_TIDE.message}
      />

      <View style={styles.body}>
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
      </View>
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
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  body: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  section: {
    gap: SPACING.xs,
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
    marginLeft: 2,
  },
  sosSection: {
    alignItems: "center",
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  });
}
