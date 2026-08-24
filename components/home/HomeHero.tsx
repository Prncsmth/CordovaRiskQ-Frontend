// components/home/HomeHero.tsx
// Full-bleed gradient hero housing the header, greeting, and tide status.
// Sits above the scroll content with a rounded bottom edge and a soft
// drop shadow, giving the top of the home screen an iOS "large card" feel.
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GreetingBlock from "@/components/home/GreetingBlock";
import HomeHeader from "@/components/home/HomeHeader";
import TideBanner, { type TideLevel } from "@/components/home/TideBanner";
import { RADIUS, SHADOW_LG, SPACING } from "@/theme";

type HomeHeroProps = {
  hasUnread: boolean;
  name: string;
  location: string;
  temperatureC: number;
  weatherDescription: string;
  tideLevel: TideLevel;
  tideMessage: string;
};

export default function HomeHero({
  hasUnread,
  name,
  location,
  temperatureC,
  weatherDescription,
  tideLevel,
  tideMessage,
}: HomeHeroProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#FFFFFF", "#FFF7F5", "#FDECEA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingTop: insets.top + SPACING.xs }]}
      >
        <View style={styles.inner}>
          <HomeHeader hasUnread={hasUnread} />

          <View style={styles.greetingSlot}>
            <GreetingBlock
              name={name}
              location={location}
              temperatureC={temperatureC}
              weatherDescription={weatherDescription}
            />
          </View>

          <TideBanner level={tideLevel} message={tideMessage} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...SHADOW_LG,
  },
  gradient: {
    borderBottomLeftRadius: RADIUS.xl + 6,
    borderBottomRightRadius: RADIUS.xl + 6,
    paddingBottom: SPACING.md,
  },
  inner: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  greetingSlot: {
    paddingTop: SPACING.xs,
  },
});
