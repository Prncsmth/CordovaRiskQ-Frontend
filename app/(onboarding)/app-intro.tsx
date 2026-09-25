import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import PrimaryButton from "@/components/auth/PrimaryButton";
import FeaturePreview, { type FeaturePreviewType } from "@/components/onboarding/FeaturePreview";
import {
    FONT_FAMILY,
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

const SLIDES: {
  icon: keyof typeof Ionicons.glyphMap;
  preview?: FeaturePreviewType;
  isLogo?: boolean;
  title: string;
  text: string;
}[] = [
  {
    icon: "radio-outline",
    isLogo: true,
    title: "Ready for the moments that matter.",
    text: "One place for emergency help, local alerts, and safer decisions in Cordova.",
  },
  {
    icon: "alert-circle-outline",
    preview: "sos",
    title: "Get help when it matters",
    text: "Send an SOS with your live location when you need urgent assistance.",
  },
  {
    icon: "document-text-outline",
    preview: "report",
    title: "Report what's happening",
    text: "File a report with a category, photo, and pinned location in seconds.",
  },
  {
    icon: "map-outline",
    preview: "map",
    title: "Know your safer options",
    text: "Find nearby evacuation centers and useful locations around Cordova.",
  },
  {
    icon: "notifications-outline",
    preview: "notifications",
    title: "Stay informed",
    text: "Get real-time updates on your reports and alerts from your community.",
  },
  {
    icon: "time-outline",
    preview: "history",
    title: "Track your reports",
    text: "See the status of everything you've reported, from pending to resolved.",
  },
  {
    icon: "call-outline",
    preview: "hotlines",
    title: "Help beyond emergencies",
    text: "Reach official hotlines, browse FAQs, and manage your account anytime.",
  },
];

const SWIPE_THRESHOLD = 50;

export default function AppIntroScreen() {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  const visualOpacity = useSharedValue(0);
  const visualScale = useSharedValue(0.82);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(14);

  const playEntranceAnimation = useCallback(() => {
    visualOpacity.value = 0;
    visualScale.value = 0.92;
    contentOpacity.value = 0;
    contentTranslateY.value = 10;
    visualOpacity.value = withTiming(1, { duration: 360 });
    visualScale.value = withSpring(1, { damping: 16, stiffness: 140 });
    contentOpacity.value = withTiming(1, { duration: 360 });
    contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 140 });
  }, [visualOpacity, visualScale, contentOpacity, contentTranslateY]);

  // A single effect keyed on `index` covers both mount (index's initial
  // value) and every slide change (swipe or button) -- a second
  // useFocusEffect trigger used to sit alongside this and fire at the same
  // time on mount, restarting the animation from 0 right after it had
  // already started, which caused a visible stutter. Damping/stiffness
  // above are tuned soft-and-quick (no overshoot bounce) so the transition
  // reads as smooth rather than springy.
  React.useEffect(() => {
    playEntranceAnimation();
  }, [index, playEntranceAnimation]);

  const visualAnimation = useAnimatedStyle(() => ({
    opacity: visualOpacity.value,
    transform: [{ scale: visualScale.value }],
  }));
  const contentAnimation = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  function goToLogin() {
    router.push("/(auth)/login");
  }

  function handleNext() {
    if (isLast) {
      goToLogin();
      return;
    }
    setIndex((i) => i + 1);
  }

  function handleBack() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const swipe = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        handleNext();
      } else if (event.translationX > SWIPE_THRESHOLD && !isFirst) {
        handleBack();
      }
    });

  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.container}>
        <StatusBar style="dark" />

        <View style={styles.topRow}>
          {!isFirst ? (
            <Pressable onPress={handleBack} hitSlop={12} style={styles.sideButton}>
              <Text style={styles.sideButtonText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.sideButton} />
          )}
          <Pressable onPress={goToLogin} hitSlop={12} style={styles.sideButton}>
            <Text style={styles.sideButtonText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Animated.View style={visualAnimation}>
            {slide.preview ? (
              <FeaturePreview type={slide.preview} />
            ) : slide.isLogo ? (
              <View style={styles.introVisual}>
                <Image
                  source={require("@/assets/images/riskq.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={styles.introVisual}>
                <Ionicons name={slide.icon} size={34} color={COLORS.primary} />
              </View>
            )}
          </Animated.View>
          <Animated.View style={contentAnimation}>
            <Text style={styles.eyebrow}>CORDOVA RISKQ</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.text}</Text>
          </Animated.View>
        </View>

        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.actionArea}>
          <PrimaryButton
            title={isLast ? "Continue to Login" : "Next"}
            onPress={handleNext}
          />
          {isLast ? (
            <Text style={styles.signUpHint}>
              New to Cordova RiskQ? You can create an account from the next screen.
            </Text>
          ) : null}
        </View>
      </View>
    </GestureDetector>
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
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    // Fixed width so Skip stays anchored in the same spot whether or not
    // Back is showing next to it (first slide has no Back).
    sideButton: {
      minWidth: 40,
    },
    sideButtonText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    hero: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
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
    logoImage: {
      width: 40,
      height: 40,
    },
    eyebrow: {
      color: COLORS.primary,
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      letterSpacing: 1.2,
      textAlign: "center",
    },
    title: {
      color: COLORS.text,
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      lineHeight: 36,
      marginTop: SPACING.xs,
      maxWidth: 340,
      textAlign: "center",
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.body,
      lineHeight: 23,
      marginTop: SPACING.md,
      maxWidth: 340,
      textAlign: "center",
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
      backgroundColor: COLORS.primary,
    },
    actionArea: {
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
