// responder/screens/TourScreen.tsx
// Responder counterpart to app/(onboarding)/app-intro.tsx -- shown right
// after responder/welcome.tsx (Continue), before a fresh responder account
// lands on the Dashboard. Same paginated slide UI (topRow Back/Skip, dots,
// swipe, FeaturePreview screenshots) as the citizen intro. forceLight
// matches WelcomeScreen.tsx, the screen immediately before this one.
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import PrimaryButton from "@/components/auth/PrimaryButton";
import FeaturePreview, { type FeaturePreviewType } from "@/components/onboarding/FeaturePreview";
import { ThemeProvider } from "@/context/ThemeContext";
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
  title: string;
  text: string;
}[] = [
  {
    icon: "shield-checkmark",
    title: "Welcome to the Team",
    text: "This app shows you active incidents, their locations, and lets you coordinate your response -- all in one place.",
  },
  {
    icon: "notifications-outline",
    preview: "responder-new-incident",
    title: "Never Miss a Call",
    text: "Get notified the instant a new incident needs a response. Accept or decline right from the alert.",
  },
  {
    icon: "map-outline",
    preview: "responder-live-map",
    title: "Track Every Incident",
    text: "See every active incident on a live map, along with your own current location.",
  },
  {
    icon: "people-outline",
    preview: "responder-lobby",
    title: "Coordinate With Your Team",
    text: "See who's joined, ring the team, and head out together once everyone's ready.",
  },
  {
    icon: "navigate-outline",
    preview: "responder-navigate",
    title: "Get There Fast",
    text: "Navigate straight to the incident with turn-by-turn directions.",
  },
  {
    icon: "alert-circle-outline",
    preview: "responder-notifications",
    title: "Stay in the Loop",
    text: "Get real-time alerts for new incidents and updates happening near you.",
  },
];

const SWIPE_THRESHOLD = 50;

export default function ResponderTourScreen() {
  return (
    <ThemeProvider forceLight>
      <ResponderTourContent />
    </ThemeProvider>
  );
}

function ResponderTourContent() {
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
    visualScale.value = 0.82;
    contentOpacity.value = 0;
    contentTranslateY.value = 14;
    visualOpacity.value = withTiming(1, { duration: 300 });
    visualScale.value = withSpring(1, { damping: 12, stiffness: 125 });
    contentOpacity.value = withTiming(1, { duration: 320 });
    contentTranslateY.value = withSpring(0, { damping: 14, stiffness: 120 });
  }, [visualOpacity, visualScale, contentOpacity, contentTranslateY]);

  useFocusEffect(
    useCallback(() => {
      playEntranceAnimation();
    }, [playEntranceAnimation]),
  );
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

  function goToDashboard() {
    router.replace("/responder");
  }

  function handleNext() {
    if (isLast) {
      goToDashboard();
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
        <View style={styles.topRow}>
          {!isFirst ? (
            <Pressable onPress={handleBack} hitSlop={12} style={styles.sideButton}>
              <Text style={styles.sideButtonText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.sideButton} />
          )}
          <Pressable onPress={goToDashboard} hitSlop={12} style={styles.sideButton}>
            <Text style={styles.sideButtonText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Animated.View style={visualAnimation}>
            {slide.preview ? (
              <FeaturePreview type={slide.preview} />
            ) : (
              <View style={styles.introVisual}>
                <Ionicons name={slide.icon} size={34} color={COLORS.tide} />
              </View>
            )}
          </Animated.View>
          <Animated.View style={contentAnimation}>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.text}</Text>
          </Animated.View>
        </View>

        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.actionArea}>
          <PrimaryButton
            title={isLast ? "Get Started" : "Next"}
            onPress={handleNext}
          />
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
      paddingTop: 62,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.lg,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
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
      backgroundColor: COLORS.tideTint,
      borderWidth: 1,
      borderColor: COLORS.tideTint,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: SPACING.md,
    },
    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      color: COLORS.text,
      lineHeight: 36,
      marginTop: SPACING.xs,
      maxWidth: 340,
      textAlign: "center",
    },
    subtitle: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.md,
      lineHeight: 23,
      maxWidth: 340,
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
      backgroundColor: COLORS.tide,
    },
    actionArea: {
      paddingBottom: SPACING.sm,
    },
  });
}
