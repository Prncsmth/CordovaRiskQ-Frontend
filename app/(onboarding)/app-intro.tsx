import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import PrimaryButton from "@/components/auth/PrimaryButton";
import {
    FONT_FAMILY,
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

const FEATURES = [
  {
    icon: "alert-circle-outline" as const,
    title: "Get help when it matters",
    text: "Send an SOS with your live location when you need urgent assistance.",
  },
  {
    icon: "map-outline" as const,
    title: "Know your safer options",
    text: "Find nearby evacuation centers and useful locations around Cordova.",
  },
  {
    icon: "notifications-outline" as const,
    title: "Stay informed",
    text: "Receive alerts and report incidents so your community can respond faster.",
  },
];

export default function AppIntroScreen() {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visualOpacity = useSharedValue(0);
  const visualScale = useSharedValue(0.82);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(14);
  const featuresOpacity = useSharedValue(0);
  const featuresTranslateY = useSharedValue(16);
  const actionOpacity = useSharedValue(0);

  const playEntranceAnimation = useCallback(() => {
    visualOpacity.value = 0;
    visualScale.value = 0.82;
    contentOpacity.value = 0;
    contentTranslateY.value = 14;
    featuresOpacity.value = 0;
    featuresTranslateY.value = 16;
    actionOpacity.value = 0;
    visualOpacity.value = withTiming(1, { duration: 350 });
    visualScale.value = withSpring(1, { damping: 12, stiffness: 125 });
    contentOpacity.value = withDelay(120, withTiming(1, { duration: 380 }));
    contentTranslateY.value = withDelay(
      120,
      withSpring(0, { damping: 14, stiffness: 120 }),
    );
    featuresOpacity.value = withDelay(240, withTiming(1, { duration: 380 }));
    featuresTranslateY.value = withDelay(
      240,
      withSpring(0, { damping: 14, stiffness: 120 }),
    );
    actionOpacity.value = withDelay(380, withTiming(1, { duration: 380 }));
  }, [
    actionOpacity,
    contentOpacity,
    contentTranslateY,
    featuresOpacity,
    featuresTranslateY,
    visualOpacity,
    visualScale,
  ]);

  useFocusEffect(
    useCallback(() => {
      playEntranceAnimation();
    }, [playEntranceAnimation]),
  );

  const visualAnimation = useAnimatedStyle(() => ({
    opacity: visualOpacity.value,
    transform: [{ scale: visualScale.value }],
  }));
  const contentAnimation = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));
  const featuresAnimation = useAnimatedStyle(() => ({
    opacity: featuresOpacity.value,
    transform: [{ translateY: featuresTranslateY.value }],
  }));
  const actionAnimation = useAnimatedStyle(() => ({
    opacity: actionOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.introVisual, visualAnimation]}>
        <Ionicons name="radio-outline" size={34} color={COLORS.primary} />
      </Animated.View>
      <Animated.View style={contentAnimation}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CORDOVA RISKQ</Text>
          <Text style={styles.title}>Ready for the moments that matter.</Text>
          <Text style={styles.subtitle}>
            One place for emergency help, local alerts, and safer decisions in
            Cordova.
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.featureList, featuresAnimation]}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.featureRow}>
            <View style={styles.iconCircle}>
              <Ionicons name={feature.icon} size={22} color={COLORS.primary} />
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.actionArea, actionAnimation]}>
        <PrimaryButton
          title="Continue to Login"
          onPress={() => router.push("/(auth)/login")}
        />
        <Text style={styles.signUpHint}>
          New to Cordova RiskQ? You can create an account from the next screen.
        </Text>
      </Animated.View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingTop: 32,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.lg,
    },
    introVisual: {
      width: 68,
      height: 68,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      borderWidth: 1,
      borderColor: COLORS.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: SPACING.md,
    },
    header: {
      paddingBottom: SPACING.md,
    },
    eyebrow: {
      color: COLORS.primary,
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    title: {
      color: COLORS.text,
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      lineHeight: 36,
      marginTop: SPACING.xs,
      maxWidth: 340,
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.body,
      lineHeight: 23,
      marginTop: SPACING.md,
      maxWidth: 340,
    },
    featureList: {
      flex: 1,
      justifyContent: "flex-start",
      gap: SPACING.md,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
    },
    iconCircle: {
      width: 46,
      height: 46,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    featureCopy: {
      flex: 1,
    },
    featureTitle: {
      color: COLORS.text,
      fontSize: TYPOGRAPHY.body,
      fontWeight: "800",
    },
    featureText: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.small,
      lineHeight: 19,
      marginTop: 2,
    },
    actionArea: {
      marginTop: SPACING.lg,
      paddingBottom: SPACING.sm,
    },
    signUpHint: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.small,
      lineHeight: 18,
      textAlign: "center",
      marginTop: SPACING.sm,
    },
  });
}
