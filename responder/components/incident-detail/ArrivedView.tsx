// components/responder/incident-detail/ArrivedView.tsx
// Phase 4 of the incident-detail flow: on-scene confirmation with a
// summary card and a single Mark Resolved action. Arrived itself means
// the responder is already on scene and assisting -- there's no separate
// "start" action, and no cancel/back-to-home actions here either (the
// screen header's own back button already covers navigating away).
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import RippleRings from "@/components/common/RippleRings";
import { getIncidentVisual } from "@/responder/components/shared/incidentVisual";
import RButton from "@/responder/components/shared/RButton";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident } from "@/responder/types/responder";
import { formatRelativeTime } from "@/utils/formatter";

import DetailRow from "./DetailRow";
import GradientIconCircle from "./GradientIconCircle";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ArrivedView({
  incident,
  onCompleteIncident,
}: {
  incident: Incident;
  onCompleteIncident: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);

  return (
    <View style={styles.body}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
            You're on scene and assisting.
          </Text>
        </View>

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

        <Text style={styles.sectionLabel}>Incident Details</Text>
        <DetailRow label="Location" value={incident.location} />
        <DetailRow
          label="Reported time"
          value={formatRelativeTime(incident.createdAt)}
        />
        <DetailRow label="Priority" value={capitalize(incident.urgency)} />
      </ScrollView>

      <RButton
        label="Mark Resolved"
        icon="checkmark-done"
        variant="primary"
        onPress={onCompleteIncident}
        style={styles.markResolvedButton}
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
      marginBottom: SPACING.sm,
    },
    sectionLabel: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textTertiary,
      fontWeight: "700",
      marginBottom: SPACING.sm,
      marginTop: SPACING.sm,
    },
    markResolvedButton: {
      marginTop: SPACING.md,
    },
  });
}
