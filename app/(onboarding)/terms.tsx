import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { signupFinishAction } from "@/utils/signupFinish";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

const SUMMARY: string[] = [
  "We use your location during active reports and SOS alerts.",
  "You'll be notified of nearby incidents and evacuation notices.",
  "We never sell your data.",
];

// One screen, two documents: the rules for using the app, then how
// personal data is handled (the Data Privacy Act's privacy notice).
// Accepting here accepts both.
const PARTS: { label: string; sections: { heading: string; body: string }[] }[] = [
  {
    label: "Terms of Use",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: "By creating an account you agree to these Terms of Use and the Privacy Policy below, and to use Cordova RiskQ responsibly for emergency reporting and community safety coordination within Cordova and partner barangays.",
      },
      {
        heading: "2. Emergency Reporting",
        body: "Reports should reflect real, ongoing emergencies. Knowingly false reports may delay responders reaching people who genuinely need help.",
      },
      {
        heading: "3. User Responsibilities",
        body: "Keep your contact details current and your device location services enabled so alerts and evacuation notices reach you in time.",
      },
      {
        heading: "4. Limitation of Liability",
        body: "Cordova RiskQ assists coordination but does not replace calling local emergency hotlines directly in life-threatening situations.",
      },
    ],
  },
  {
    label: "Privacy Policy",
    sections: [
      {
        heading: "5. Location & Data Sharing",
        body: "Only when you submit a report or trigger an SOS, your real-time location and the details you provide are shared with Cordova responders and the MDRRMO operators, so help can find you quickly. Responders assigned to your incident can also see your name and call your mobile number from the app; the number itself is not displayed.",
      },
      {
        heading: "6. Data Privacy (RA 10173)",
        body: "Your personal information is handled in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173). We collect your name, email, mobile number, and the location and details of the reports and SOS alerts you send, and use them only to coordinate emergency response. Your data is kept only as long as needed for emergency response and official records, as set by the Cordova MDRRMO. You can update your details in your Profile, and request access to or deletion of your account and data through Contact Support in the app.",
      },
    ],
  },
];

export default function TermsScreen() {
  const { user, finishRegistration, completeTerms, signedUpWithGoogle } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  // Explicit consent: the button stays disabled until this is ticked, on
  // top of having scrolled to the end.
  const [agreed, setAgreed] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 12) {
      setHasScrolledToBottom(true);
    }
  }

  function handleLayout(e: LayoutChangeEvent) {
    setViewportHeight(e.nativeEvent.layout.height);
  }

  function handleContentSizeChange(_w: number, height: number) {
    setContentHeight(height);
  }

  // Content may fully fit within the viewport (nothing to scroll), in which
  // case onScroll never fires -- so that counts as having reached the end.
  // Derived from both heights, so it holds whichever of onLayout /
  // onContentSizeChange reports first.
  const fitsWithoutScrolling =
    viewportHeight > 0 && contentHeight > 0 && contentHeight <= viewportHeight + 12;
  const scrolledToBottom = hasScrolledToBottom || fitsWithoutScrolling;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Terms & Privacy Policy</Text>
        <Text style={styles.subtitle}>Please review both before you continue.</Text>

        <View style={styles.summaryCard}>
          {SUMMARY.map((line) => (
            <View key={line} style={styles.summaryRow}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.primary}
                style={styles.summaryIcon}
              />
              <Text style={styles.summaryText}>{line}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        onLayout={handleLayout}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
      >
        {PARTS.map((part) => (
          <View key={part.label}>
            <Text style={styles.partLabel}>{part.label}</Text>
            {part.sections.map((s) => (
              <View key={s.heading} style={styles.section}>
                <Text style={styles.sectionHeading}>{s.heading}</Text>
                <Text style={styles.sectionBody}>{s.body}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => setAgreed((prev) => !prev)}
          hitSlop={8}
          style={styles.consentRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="I have read and agree to the Terms of Use and Privacy Policy"
        >
          <Ionicons
            name={agreed ? "checkbox" : "square-outline"}
            size={22}
            color={agreed ? COLORS.primary : COLORS.textTertiary}
          />
          <Text style={styles.consentText}>
            I have read and agree to the{" "}
            <Text style={styles.consentStrong}>Terms of Use</Text> and{" "}
            <Text style={styles.consentStrong}>Privacy Policy</Text>.
          </Text>
        </Pressable>

        <PrimaryButton
          title={scrolledToBottom ? "I Agree & Continue" : "Scroll to Bottom"}
          disabled={!scrolledToBottom || !agreed}
          onPress={async () => {
            if (!user || !agreed) return;

            // Google sign-up: stay signed in. completeTerms() clears the
            // last onboarding gate, and RootLayoutNav (app/_layout.tsx) then
            // sends this fully onboarded account to Home itself, where the
            // first-time app guide starts (isFreshAccount is still set).
            // No auth change, so no navigator remount to race.
            if (signupFinishAction(signedUpWithGoogle) === "stay-signed-in") {
              completeTerms();
              return;
            }

            // Email/password sign-up: finishRegistration() logs the account
            // out (isAuthenticated -> false) and marks it pending for the
            // tour in one atomic AuthContext update, then returns -- it does
            // NOT navigate. app/_layout.tsx's Stack remounts its whole
            // navigator tree whenever isAuthenticated flips (it's keyed on
            // that value), so calling router.replace() here ourselves would
            // race that remount and can throw "action not handled by any
            // navigator". RootLayoutNav's effect reads justRegistered and
            // sends the user to registration-complete itself, after the
            // remount settles.
            await finishRegistration(user.id, user.name);
          }}
        />
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    header: {
      paddingTop: 62,
      paddingHorizontal: SPACING.lg,
    },

    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: 24,
      color: COLORS.text,
      marginTop: SPACING.md,
    },

    subtitle: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: SPACING.xs,
    },

    summaryCard: {
      marginTop: SPACING.md,
      backgroundColor: COLORS.primaryTint,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: `${COLORS.primary}14`,
      padding: SPACING.md,
      gap: SPACING.sm,
      ...SHADOW,
    },

    summaryRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },

    summaryIcon: {
      marginTop: 2,
      marginRight: SPACING.xs,
    },

    summaryText: {
      flex: 1,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },

    body: {
      flex: 1,
      marginTop: SPACING.md,
    },

    bodyContent: {
      padding: SPACING.lg,
      gap: SPACING.md,
    },

    // "TERMS OF USE" / "PRIVACY POLICY" -- same uppercase label style as
    // the app's other section headers.
    partLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: COLORS.primary,
      marginBottom: SPACING.sm,
    },

    section: {
      marginBottom: SPACING.md,
    },

    sectionHeading: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },

    sectionBody: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      lineHeight: 21,
    },

    footer: {
      padding: SPACING.lg,
      gap: SPACING.md,
    },

    consentRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACING.sm,
    },

    consentText: {
      flex: 1,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },

    consentStrong: {
      fontWeight: "700",
      color: COLORS.text,
    },
  });
}
