// app/responder/welcome.tsx
// Responder counterpart to app/getting-started/welcome.tsx -- shown right
// after phone-number.tsx completes onboarding for an account with
// role === "responder", instead of the citizen-oriented getting-started
// flow (whose copy and tour steps are all about SOS/reporting/evacuation
// maps, none of which apply to a responder's dashboard).
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import RippleRings from "@/components/common/RippleRings";
import { useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import {
    FONT_FAMILY,
    RADIUS,
    SHADOW_LG,
    SPACING,
    TYPOGRAPHY,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

export default function ResponderWelcomeScreen() {
  return (
    <ThemeProvider forceLight>
      <ResponderWelcomeContent />
    </ThemeProvider>
  );
}

function ResponderWelcomeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const firstName = user?.name?.split(" ")[0] ?? "Responder";

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <RippleRings
          size={220}
          ringCount={3}
          color={`${COLORS.tide}12`}
          style={styles.watermark}
        />
        <View style={styles.badgeCircle}>
          <Ionicons name="shield-checkmark" size={44} color={COLORS.white} />
        </View>
        <Text style={styles.title}>Welcome to the Team, {firstName}!</Text>
        <Text style={styles.subtitle}>
          You&apos;re set up as a responder. Go online from your dashboard to
          start receiving incident alerts near you.
        </Text>

        <View style={styles.pointsCard}>
          <ResponderPoint
            icon="notifications-outline"
            text="Incoming incidents show up on your dashboard in real time"
          />
          <ResponderPoint
            icon="navigate-outline"
            text="Accept a call to see the citizen's live pinned location"
          />
          <ResponderPoint
            icon="radio-button-on-outline"
            text="Toggle Online/Offline any time you're on or off duty"
          />
        </View>
      </View>

      <PrimaryButton
        title="Go to Dashboard"
        onPress={() => router.replace("/responder")}
      />
    </View>
  );
}

function ResponderPoint({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.pointRow}>
      <View style={styles.pointIcon}>
        <Ionicons name={icon} size={16} color={COLORS.tide} />
      </View>
      <Text style={styles.pointText}>{text}</Text>
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
    badgeCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: COLORS.tide,
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
    pointsCard: {
      width: "100%",
      marginTop: SPACING.xl,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      gap: SPACING.sm,
    },
    pointRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    pointIcon: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tideTint,
      alignItems: "center",
      justifyContent: "center",
    },
    pointText: {
      flex: 1,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
      fontWeight: "600",
    },
  });
}
