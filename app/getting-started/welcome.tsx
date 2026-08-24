// app/getting-started/welcome.tsx
// First screen after phone-number.tsx completes registration -- a short
// celebratory beat before the app tour. Not part of (onboarding): that
// group is the pre-account walkthrough, this is post-account.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import RippleRings from "@/components/common/RippleRings";
import { useAuth } from "@/context/AuthContext";
import {
  FONT_FAMILY,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default function GettingStartedWelcomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <RippleRings
          size={220}
          ringCount={3}
          color={`${COLORS.primary}12`}
          style={styles.watermark}
        />
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={44} color={COLORS.white} />
        </View>
        <Text style={styles.title}>You&apos;re All Set, {firstName}!</Text>
        <Text style={styles.subtitle}>
          Your account is ready. Let&apos;s take a quick look at what Cordova
          RiskQ can do for you.
        </Text>
      </View>

      <PrimaryButton
        title="Continue"
        onPress={() => router.replace("/getting-started/tour")}
      />
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingHorizontal: SPACING.lg,
      paddingTop: 80,
      paddingBottom: SPACING.lg,
    },
    hero: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    watermark: {
      position: "absolute",
    },
    checkCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: COLORS.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.lg,
      ...SHADOW_LG,
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
