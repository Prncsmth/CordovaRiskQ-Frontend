import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import PrimaryButton from "@/components/auth/PrimaryButton";
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

export default function RegistrationCompleteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.7);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);
  const actionOpacity = useSharedValue(0);

  React.useEffect(() => {
    iconOpacity.value = withTiming(1, { duration: 350 });
    iconScale.value = withSpring(1, { damping: 12, stiffness: 130 });
    contentOpacity.value = withDelay(180, withTiming(1, { duration: 420 }));
    contentTranslateY.value = withDelay(
      180,
      withSpring(0, { damping: 14, stiffness: 120 }),
    );
    actionOpacity.value = withDelay(360, withTiming(1, { duration: 400 }));
  }, [
    actionOpacity,
    contentOpacity,
    contentTranslateY,
    iconOpacity,
    iconScale,
  ]);

  const iconAnimation = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));
  const contentAnimation = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));
  const actionAnimation = useAnimatedStyle(() => ({
    opacity: actionOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Animated.View style={[styles.iconCircle, iconAnimation]}>
          <Ionicons name="checkmark" size={46} color={COLORS.white} />
        </Animated.View>
        <Animated.View style={[styles.contentCopy, contentAnimation]}>
          <Text style={styles.eyebrow}>ACCOUNT READY</Text>
          <Text style={styles.title}>You&apos;re all set, {firstName}.</Text>
          <Text style={styles.subtitle}>
            Your Cordova RiskQ account is ready. Log in to access alerts, report
            incidents, and coordinate emergency assistance.
          </Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.actionArea, actionAnimation]}>
        <PrimaryButton
          title="Go to Login"
          onPress={() => router.replace("/(auth)/login")}
        />
      </Animated.View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingTop: 80,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.lg,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    contentCopy: {
      width: "100%",
      alignItems: "center",
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.lg,
      ...SHADOW_LG,
    },
    eyebrow: {
      color: COLORS.success,
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      letterSpacing: 1.2,
    },
    title: {
      color: COLORS.text,
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      textAlign: "center",
      marginTop: SPACING.xs,
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.body,
      lineHeight: 23,
      textAlign: "center",
      marginTop: SPACING.md,
      maxWidth: 330,
    },
    actionArea: {
      marginBottom: SPACING.xl,
    },
  });
}
