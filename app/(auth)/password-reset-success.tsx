import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

// Step 4 of password reset: confirmation only. It does not log in -- the
// user goes back to Login and signs in with the new password.
export default function PasswordResetSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const goToLogin = () => router.replace("/login");

  // Android back goes to Login too, never back into the used-up reset steps.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/login");
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // Same entrance as (onboarding)/registration-complete.tsx: the icon pops
  // in, then the copy fades up.
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.7);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);

  useEffect(() => {
    iconOpacity.value = withTiming(1, { duration: 350 });
    iconScale.value = withSpring(1, { damping: 12, stiffness: 130 });
    contentOpacity.value = withDelay(180, withTiming(1, { duration: 420 }));
    contentTranslateY.value = withDelay(180, withSpring(0, { damping: 14, stiffness: 120 }));
  }, [contentOpacity, contentTranslateY, iconOpacity, iconScale]);

  const iconAnimation = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));
  const contentAnimation = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + SPACING.lg }]}>
      <View style={styles.body}>
        <Animated.View style={[styles.checkCircle, iconAnimation]}>
          <Ionicons name="checkmark" size={46} color={COLORS.white} />
        </Animated.View>
        <Animated.View style={[styles.copy, contentAnimation]}>
          <Text style={styles.eyebrow}>PASSWORD UPDATED</Text>
          <Text style={styles.title}>Password Reset Successful</Text>
          <Text style={styles.subtitle}>
            Your password has been reset. You can now log in with your new password.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={contentAnimation}>
        <PrimaryButton title="Back to Login" onPress={goToLogin} />
      </Animated.View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    // Same layout as (onboarding)/registration-complete.tsx.
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingTop: 80,
      paddingHorizontal: SPACING.lg,
    },

    body: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },

    checkCircle: {
      width: 96,
      height: 96,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.lg,
      ...SHADOW_LG,
    },

    copy: {
      width: "100%",
      alignItems: "center",
    },

    eyebrow: {
      color: COLORS.success,
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      letterSpacing: 1.2,
    },

    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      color: COLORS.text,
      textAlign: "center",
      marginTop: SPACING.xs,
    },

    subtitle: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.md,
      lineHeight: 23,
      maxWidth: 330,
    },
  });
}
