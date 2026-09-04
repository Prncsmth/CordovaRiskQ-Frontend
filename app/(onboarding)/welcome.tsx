import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import RippleRings from "@/components/common/RippleRings";
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

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <RippleRings
          size={260}
          ringCount={3}
          color={`${COLORS.tide}0D`}
          style={styles.watermark}
        />

        <Image
          source={require("@/assets/images/riskq.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Stay ahead of the emergency.</Text>
        <Text style={styles.subtitle}>
          Cordova RiskQ connects you to real-time alerts, incident reporting,
          and emergency response for your community.
        </Text>
      </View>

      <PrimaryButton
        title="Get started"
        onPress={() => router.push("/(auth)/login")}
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

    watermark: {
      position: "absolute",
      top: "50%",
      marginTop: -130,
    },

    logo: {
      width: 88,
      height: 88,
      marginBottom: SPACING.xl,
    },

    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      color: COLORS.text,
      textAlign: "center",
    },

    subtitle: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.md,
      lineHeight: 22,
      maxWidth: 320,
    },
  });
}
