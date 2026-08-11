import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StepIndicator step={0} />

      <View style={styles.hero}>
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
        onPress={() => router.push("/(onboarding)/phone-number")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: 88,
    height: 88,
    marginBottom: SPACING.xl,
  },

  title: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: "700",
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
