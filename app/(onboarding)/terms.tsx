import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BackButton from "@/components/common/BackButton";
import { useAuth } from "@/context/AuthContext";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

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
  const { completeOnboarding } = useAuth();
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
        <BackButton onPress={() => router.back()} />
        <Text style={styles.eyebrow}>Agreement</Text>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.updated}>Last updated on 7/24/2026</Text>
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
        <TouchableOpacity
          style={[
            styles.cta,
            scrolledToBottom ? styles.ctaActive : styles.ctaInactive,
          ]}
          disabled={!scrolledToBottom}
          onPress={() => {
            completeOnboarding();
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.ctaText,
              scrolledToBottom ? styles.ctaTextActive : styles.ctaTextInactive,
            ]}
          >
            {scrolledToBottom ? "I Agree & Continue" : "Scroll to Bottom"}
          </Text>
        </TouchableOpacity>
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

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.primary,
    textTransform: "uppercase",
    marginTop: SPACING.md,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.xs,
  },

  updated: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },

  body: {
    flex: 1,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMuted,
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

  cta: {
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  ctaActive: {
    backgroundColor: COLORS.primary,
  },

  ctaInactive: {
    backgroundColor: COLORS.borderMuted,
  },

  ctaText: {
    fontSize: 15,
    fontWeight: "700",
  },

  ctaTextActive: {
    color: COLORS.white,
  },

  ctaTextInactive: {
    color: COLORS.textTertiary,
  },
});
