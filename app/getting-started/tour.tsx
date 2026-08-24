// app/getting-started/tour.tsx
// Short "how to use the app" walkthrough shown once, right after
// getting-started/welcome.tsx, before the new account lands on Home.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import RippleRings from "@/components/common/RippleRings";
import { useAuth } from "@/context/AuthContext";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

type TourStep = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
};

function getSteps(COLORS: ColorPalette): TourStep[] {
  return [
    {
      icon: "alert-circle",
      color: COLORS.primary,
      title: "One tap for help",
      description:
        "Hit the SOS button on Home in a real emergency to instantly alert responders with your live location.",
    },
    {
      icon: "document-text",
      color: COLORS.warning,
      title: "Report an incident",
      description:
        "Flood, fire, medical, or road accident — file a report with a photo and your pinned location in seconds.",
    },
    {
      icon: "map",
      color: COLORS.tide,
      title: "Find your way to safety",
      description:
        "See nearby evacuation centers on the map and search any barangay in Cordova.",
    },
    {
      icon: "notifications",
      color: "#2F6FED",
      title: "Stay in the loop",
      description:
        "Get tide-level updates, safety tips, and alerts for incidents happening near you.",
    },
  ];
}

export default function TourScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const STEPS = useMemo(() => getSteps(COLORS), [COLORS]);
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  function finish() {
    const homeRoute = user?.role === "responder" ? "/responder" : "/(tabs)/home";
    router.replace(homeRoute);
  }

  function handleNext() {
    if (isLast) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={finish} hitSlop={12} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <View style={styles.hero}>
        <RippleRings
          size={200}
          ringCount={2}
          color={`${step.color}14`}
          style={styles.watermark}
        />
        <View style={[styles.iconCircle, { backgroundColor: step.color }]}>
          <Ionicons name={step.icon} size={40} color={COLORS.white} />
        </View>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
      </View>

      <View style={styles.dotsRow}>
        {STEPS.map((s, i) => (
          <View
            key={s.title}
            style={[
              styles.dot,
              i === index && [styles.dotActive, { backgroundColor: step.color }],
            ]}
          />
        ))}
      </View>

      <PrimaryButton title={isLast ? "Get Started" : "Next"} onPress={handleNext} />
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.lg,
      paddingTop: 62,
      paddingBottom: SPACING.lg,
    },
    skipButton: {
      alignSelf: "flex-end",
    },
    skipText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    hero: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    watermark: {
      position: "absolute",
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.lg,
      ...SHADOW_LG,
    },
    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.heading,
      color: COLORS.text,
      textAlign: "center",
    },
    description: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.sm,
      lineHeight: 22,
      maxWidth: 320,
    },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      marginBottom: SPACING.lg,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
    },
    dotActive: {
      width: 22,
    },
  });
}
