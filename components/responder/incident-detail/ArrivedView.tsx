// components/responder/incident-detail/ArrivedView.tsx
// Phase 4 of the incident-detail flow: on-scene confirmation with a
// summary card and follow-up actions (start assistance, head home, or
// cancel the incident).
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import RippleRings from "@/components/common/RippleRings";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import RButton from "@/components/responder/RButton";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident } from "@/types/responder";

import ActionRow from "./ActionRow";
import GradientIconCircle from "./GradientIconCircle";

export default function ArrivedView({
  incident,
  onStartAssistance,
  onCancelIncident,
}: {
  incident: Incident;
  onStartAssistance: () => void;
  onCancelIncident: () => void;
}) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);

  return (
    <View style={styles.body}>
      <View style={styles.centeredBody}>
        <View style={styles.pulseWrap}>
          <RippleRings
            size={120}
            ringCount={2}
            animated
            color={`${COLORS.success}33`}
            style={styles.pulseRings}
          />
          <GradientIconCircle
            color={COLORS.success}
            size={88}
            iconSize={40}
            icon="checkmark"
            COLORS={COLORS}
          />
        </View>
        <Text style={styles.arrivedText}>You've Arrived</Text>
        <Text style={styles.arrivedSubtext}>
          You're on scene. Let your team know when you're ready to help.
        </Text>

        <View style={[styles.summaryCard, styles.arrivedSummaryCard]}>
          <GradientIconCircle
            color={visual.color}
            size={40}
            iconSize={18}
            icon={visual.icon}
            COLORS={COLORS}
          />
          <View>
            <Text style={styles.summaryTitle}>{incident.type}</Text>
            <Text style={styles.summarySubtitle}>{incident.location}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Actions</Text>
      <RButton
        label="Start Assistance"
        icon="people"
        variant="primary"
        onPress={onStartAssistance}
      />
      <ActionRow
        icon="home-outline"
        label="Back to Home"
        onPress={() => router.dismissTo("/responder")}
      />
      <ActionRow
        icon="close-circle-outline"
        label="Cancel Incident"
        onPress={onCancelIncident}
        danger
      />
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    body: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.md,
    },
    centeredBody: {
      alignItems: "center",
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    pulseWrap: {
      width: 120,
      height: 120,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.md,
    },
    pulseRings: {
      position: "absolute",
      top: 0,
      left: 0,
    },
    arrivedText: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.heading,
      color: COLORS.text,
      textAlign: "center",
    },
    arrivedSubtext: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: 4,
      marginBottom: SPACING.lg,
      paddingHorizontal: SPACING.md,
    },
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      gap: SPACING.sm,
      ...SHADOW,
    },
    summaryTitle: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.text,
    },
    summarySubtitle: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
    },
    arrivedSummaryCard: {
      alignSelf: "stretch",
      marginBottom: SPACING.xl,
    },
    sectionLabel: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textTertiary,
      fontWeight: "700",
      marginBottom: SPACING.sm,
      marginTop: SPACING.sm,
    },
  });
}
