// components/support/SupportRequestSent.tsx
// Confirmation state for app/contact-support/index.tsx, shown in place of the
// form once a support request has been stored on the backend: what was sent,
// what happens next, and where to go from here.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";

type SupportRequestSentProps = {
  topic: string;
  subject: string;
  sentAt: Date;
  onDone: () => void;
  onSendAnother: () => void;
};

const NEXT_STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  {
    icon: "mail-open-outline",
    title: "Received",
    text: "Your request is now in our support team's inbox.",
  },
  {
    icon: "people-outline",
    title: "Under review",
    text: "A team member will read it and look into what happened.",
  },
  {
    icon: "chatbubble-ellipses-outline",
    title: "We get back to you",
    text: "Expect a reply within one business day.",
  },
];

function formatSentAt(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SupportRequestSent({
  topic,
  subject,
  sentAt,
  onDone,
  onSendAnother,
}: SupportRequestSentProps) {
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.xl, paddingBottom: SPACING.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeOuter}>
          <View style={styles.badgeInner}>
            <Ionicons name="checkmark" size={38} color={COLORS.white} />
          </View>
        </View>

        <Text style={styles.title}>Request sent</Text>
        <Text style={styles.subtitle}>
          Our support team has received your request and will get back to you as soon
          as possible.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.topicChip}>
              <Text style={styles.topicChipText}>{topic}</Text>
            </View>
            <Text style={styles.sentAt}>{formatSentAt(sentAt)}</Text>
          </View>
          <Text style={styles.summarySubject} numberOfLines={2}>
            {subject}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What happens next</Text>
        <View style={styles.stepsCard}>
          {NEXT_STEPS.map((step, index) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepRail}>
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon} size={18} color={COLORS.tide} />
                </View>
                {index < NEXT_STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          For immediate danger, use SOS or call a local emergency hotline.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <PrimaryButton title="DONE" onPress={onDone} colors={[COLORS.tide, COLORS.tide]} />
        <Pressable onPress={onSendAnother} style={styles.secondaryLink} hitSlop={8}>
          <Text style={styles.secondaryLinkText}>Send another request</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingHorizontal: SPACING.lg, alignItems: "center" },
    badgeOuter: {
      width: 104,
      height: 104,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tideTint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.lg,
    },
    badgeInner: {
      width: 72,
      height: 72,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tide,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: COLORS.tide,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      color: COLORS.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: TYPOGRAPHY.caption,
      lineHeight: 22,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.sm,
    },
    summaryCard: {
      alignSelf: "stretch",
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      marginTop: SPACING.lg,
      gap: SPACING.sm,
      ...SHADOW,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    topicChip: {
      backgroundColor: COLORS.tideTint,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm + 2,
      paddingVertical: 4,
    },
    topicChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: COLORS.tide,
    },
    sentAt: {
      fontSize: 12,
      color: COLORS.textTertiary,
    },
    summarySubject: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.body,
      lineHeight: 22,
      color: COLORS.text,
    },
    sectionTitle: {
      alignSelf: "flex-start",
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    stepsCard: {
      alignSelf: "stretch",
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
    },
    stepRow: {
      flexDirection: "row",
      gap: SPACING.md,
    },
    stepRail: {
      alignItems: "center",
    },
    stepIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.background,
      alignItems: "center",
      justifyContent: "center",
    },
    stepLine: {
      width: 2,
      flex: 1,
      minHeight: SPACING.md,
      backgroundColor: COLORS.borderMuted,
      marginVertical: 4,
    },
    stepCopy: {
      flex: 1,
      paddingBottom: SPACING.md,
      paddingTop: 2,
    },
    stepTitle: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "800",
      color: COLORS.text,
    },
    stepText: {
      fontSize: TYPOGRAPHY.small,
      lineHeight: 18,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    disclaimer: {
      fontSize: TYPOGRAPHY.small,
      lineHeight: 18,
      color: COLORS.textTertiary,
      textAlign: "center",
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.md,
    },
    footer: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      backgroundColor: COLORS.background,
    },
    secondaryLink: {
      alignSelf: "center",
      paddingVertical: SPACING.md,
    },
    secondaryLinkText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.tide,
    },
  });
}
