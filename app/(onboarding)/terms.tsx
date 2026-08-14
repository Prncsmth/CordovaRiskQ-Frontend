import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

const SUMMARY: string[] = [
  "We use your location during active reports and SOS alerts.",
  "You'll be notified of nearby incidents and evacuation notices.",
  "We never sell your data.",
];

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Acceptance of Terms",
    body: "By creating an account you agree to use Cordova RiskQ responsibly for emergency reporting and community safety coordination within Cordova and partner barangays.",
  },
  {
    heading: "2. Location & Data Sharing",
    body: "The app shares your real-time geolocation with local responders and volunteers only when you submit a report or trigger an SOS, so help can find you quickly.",
  },
  {
    heading: "3. Emergency Reporting",
    body: "Reports should reflect real, ongoing emergencies. Knowingly false reports may delay responders reaching people who genuinely need help.",
  },
  {
    heading: "4. User Responsibilities",
    body: "Keep your contact details current and your device location services enabled so alerts and evacuation notices reach you in time.",
  },
  {
    heading: "5. Limitation of Liability",
    body: "Cordova RiskQ assists coordination but does not replace calling local emergency hotlines directly in life-threatening situations.",
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 12) {
      setScrolledToBottom(true);
    }
  }

  function handleLayout(e: LayoutChangeEvent) {
    setViewportHeight(e.nativeEvent.layout.height);
  }

  function handleContentSizeChange(_w: number, height: number) {
    setContentHeight(height);
  }

  // Content may fully fit within the viewport (nothing to scroll), in which
  // case onScroll never fires. This re-evaluates whenever either the
  // viewport or content height becomes known, regardless of which of
  // onLayout / onContentSizeChange fires first.
  useEffect(() => {
    if (
      viewportHeight > 0 &&
      contentHeight > 0 &&
      contentHeight <= viewportHeight + 12
    ) {
      setScrolledToBottom(true);
    }
  }, [viewportHeight, contentHeight]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.back()} />
          <StepIndicator step={1} style={styles.stepIndicator} />
        </View>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>
          Please review before we get your number.
        </Text>

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
        {SECTIONS.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{s.heading}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={scrolledToBottom ? "I Agree & Continue" : "Scroll to Bottom"}
          disabled={!scrolledToBottom}
          onPress={() => router.push("/(onboarding)/phone-number")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingTop: 62,
    paddingHorizontal: SPACING.lg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },

  stepIndicator: {
    flex: 1,
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
    padding: SPACING.md,
    gap: SPACING.sm,
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
  },
});
