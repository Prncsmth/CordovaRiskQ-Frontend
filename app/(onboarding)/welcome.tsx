import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
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
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.82);
  const logoTranslateY = useSharedValue(14);
  const copyOpacity = useSharedValue(0);
  const copyTranslateY = useSharedValue(12);

  React.useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    logoTranslateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    copyOpacity.value = withDelay(180, withTiming(1, { duration: 420 }));
    copyTranslateY.value = withDelay(
      180,
      withSpring(0, { damping: 14, stiffness: 120 }),
    );
  }, [logoOpacity, logoScale, logoTranslateY, copyOpacity, copyTranslateY]);

  const logoAnimation = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value },
    ],
  }));
  const copyAnimation = useAnimatedStyle(() => ({
    opacity: copyOpacity.value,
    transform: [{ translateY: copyTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.hero}>
        <Animated.View style={logoAnimation}>
          <Image
            source={require("@/assets/images/riskq.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={copyAnimation}>
          <View style={styles.brandName}>
            <View style={styles.brandLine}>
              <Text style={styles.cordovaText}>C</Text>
              <Image
                source={require("@/assets/images/cordova-logo.png")}
                style={styles.monogram}
                resizeMode="contain"
              />
              <Text style={styles.cordovaText}>RDOVA</Text>
              <Text style={styles.riskqText}>RISKQ</Text>
            </View>
          </View>
          <Text style={styles.brandDescriptor}>
            Geolocation Emergency Based and Assistance Coordination
          </Text>
        </Animated.View>
      </View>

      <PrimaryButton
        title="Get started"
        style={styles.getStartedButton}
        onPress={() => router.push("/(onboarding)/app-intro")}
      />
    </View>
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
    hero: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    logo: {
      width: 118,
      height: 118,
      marginBottom: SPACING.lg,
    },

    brandName: {
      alignItems: "center",
    },
    brandLine: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      marginBottom: -2,
    },
    cordovaText: {
      fontFamily: FONT_FAMILY.wordmark,
      fontSize: 22,
      color: COLORS.primary,
      letterSpacing: -1,
      includeFontPadding: false,
    },
    monogram: {
      width: 22,
      height: 22,
      marginHorizontal: -1,
    },
    riskqText: {
      fontFamily: FONT_FAMILY.wordmark,
      fontSize: 22,
      color: COLORS.secondary,
      letterSpacing: -1,
      includeFontPadding: false,
      marginLeft: 4,
    },

    brandDescriptor: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.black,
      textAlign: "center",
      marginTop: SPACING.md,
      lineHeight: 23,
      maxWidth: 300,
    },
    getStartedButton: {
      marginBottom: SPACING.xl,
    },
  });
}
