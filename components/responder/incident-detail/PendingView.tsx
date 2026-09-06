// components/responder/incident-detail/PendingView.tsx
// Phase 1 of the incident-detail flow: a new incident offer, shown before
// the responder accepts or declines.
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import RippleRings from "@/components/common/RippleRings";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import RButton from "@/components/responder/RButton";
import UrgencyBadge from "@/components/responder/UrgencyBadge";
import {
  FONT_FAMILY,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident } from "@/types/responder";

import GradientIconCircle from "./GradientIconCircle";

export default function PendingView({
  incident,
  onAccept,
  onDecline,
}: {
  incident: Incident;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);

  return (
    <View style={styles.centeredBody}>
      <View style={styles.pulseWrap}>
        <RippleRings
          size={120}
          ringCount={2}
          animated
          color={`${visual.color}33`}
          style={styles.pulseRings}
        />
        <GradientIconCircle
          color={visual.color}
          size={88}
          iconSize={34}
          icon={visual.icon}
          COLORS={COLORS}
        />
      </View>
      <Text style={styles.incidentType}>{incident.type}</Text>
      <Text style={styles.incidentLocation}>{incident.location}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Distance</Text>
          <Text style={styles.metaValue}>
            {incident.distanceKm != null ? `${incident.distanceKm.toFixed(1)} km` : "Unknown"}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Urgency</Text>
          <UrgencyBadge urgency={incident.urgency} />
        </View>
      </View>

      <View style={styles.pendingActions}>
        <RButton label="Accept" onPress={onAccept} variant="primary" />
        <RButton label="Decline" onPress={onDecline} variant="secondary" />
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
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
    incidentType: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.heading,
      color: COLORS.text,
      textAlign: "center",
    },
    incidentLocation: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      marginTop: 4,
      marginBottom: SPACING.lg,
    },
    metaRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginBottom: SPACING.xl,
    },
    metaBox: {
      alignItems: "center",
      gap: 4,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.lg,
      minWidth: 108,
    },
    metaLabel: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      fontWeight: "600",
    },
    metaValue: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      fontWeight: "700",
    },
    pendingActions: {
      width: "100%",
    },
  });
}
