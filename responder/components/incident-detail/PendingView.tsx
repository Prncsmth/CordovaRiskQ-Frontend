// components/responder/incident-detail/PendingView.tsx
// Phase 1 of the incident-detail flow: a new incident offer, shown before
// the responder accepts or declines. The details scroll; Accept/Decline sit
// in a fixed footer, so a photo or a long description can never push them
// off the screen.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RippleRings from "@/components/common/RippleRings";
import { getIncidentVisual } from "@/responder/components/shared/incidentVisual";
import RButton from "@/responder/components/shared/RButton";
import UrgencyBadge from "@/responder/components/shared/UrgencyBadge";
import {
  FONT_FAMILY,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident } from "@/responder/types/responder";

import GradientIconCircle from "./GradientIconCircle";
import IncidentPhoto from "./IncidentPhoto";
import { incidentDetailsText } from "./incidentDetailsText";

export default function PendingView({
  incident,
  onAccept,
  onDecline,
  isRejoin = false,
}: {
  incident: Incident;
  onAccept: () => void;
  onDecline: () => void;
  // True when this responder previously left this incident and is looking
  // at it again. Decline isn't offered here: the backend only allows
  // "declined" as a transition from no-row-yet, so it would 409 for a
  // rejoin -- the header's Back button already covers "never mind".
  isRejoin?: boolean;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const visual = getIncidentVisual(incident.type);
  const details = incidentDetailsText(incident);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pulseWrap}>
          <RippleRings
            size={100}
            ringCount={2}
            animated
            color={`${visual.color}33`}
            style={styles.pulseRings}
          />
          <GradientIconCircle
            color={visual.color}
            size={72}
            iconSize={30}
            icon={visual.icon}
            COLORS={COLORS}
          />
        </View>
        <Text style={styles.incidentType}>{incident.type}</Text>
        <Text style={styles.incidentLocation}>{incident.location}</Text>
        {isRejoin && (
          <Text style={styles.rejoinNote}>You previously left this incident.</Text>
        )}

        {/* What decides "can I take this?" first: how far, how urgent. */}
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

        {/* Not their own barangay: it reached them as backup (MDRRMO, with no
            on-duty BDRRMO there) or because nobody took it in 2 minutes. */}
        {incident.canRespond && incident.escalated ? (
          <View style={styles.escalatedNote}>
            <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
            <Text style={styles.escalatedText}>
              No responder from this barangay is available yet, so it&apos;s open to you.
            </Text>
          </View>
        ) : null}

        <View style={styles.detailsCard}>
          <Text style={styles.detailsLabel}>What happened</Text>
          <Text style={[styles.detailsText, !details.provided && styles.detailsMuted]}>
            {details.text}
          </Text>
          <IncidentPhoto uri={incident.photoUrl} style={styles.photo} />
        </View>
      </ScrollView>

      {/* Fixed footer, always reachable. Outside this responder's scope (the
          backend's canRespond): view only, from the Live Map or a direct
          link -- no Accept/Decline, and the backend rejects them anyway. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.sm }]}>
        {incident.canRespond ? (
          <View style={styles.pendingActions}>
            {!isRejoin && (
              <RButton
                label="Decline"
                onPress={onDecline}
                variant="secondary"
                style={styles.actionButton}
              />
            )}
            <RButton
              label={isRejoin ? "Rejoin" : "Accept"}
              onPress={onAccept}
              variant="primary"
              style={styles.actionButton}
            />
          </View>
        ) : (
          <View style={styles.viewOnly}>
            <Ionicons name="eye-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.viewOnlyText}>
              View only — this incident is outside your assigned barangay.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      alignItems: "center",
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.lg,
    },
    pulseWrap: {
      width: 100,
      height: 100,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.sm,
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
      textAlign: "center",
      marginTop: 4,
      marginBottom: SPACING.lg,
    },
    rejoinNote: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      marginBottom: SPACING.lg,
    },
    // What decides "can I take this?" -- two equal cards, full width.
    metaRow: {
      width: "100%",
      flexDirection: "row",
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    metaBox: {
      flex: 1,
      alignItems: "center",
      gap: 4,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
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
    escalatedNote: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: COLORS.warningBg,
    },
    escalatedText: {
      flex: 1,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
      lineHeight: 19,
    },
    detailsCard: {
      width: "100%",
      gap: 4,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      backgroundColor: COLORS.surface,
    },
    detailsLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: COLORS.textTertiary,
    },
    detailsText: {
      fontSize: TYPOGRAPHY.body,
      lineHeight: 22,
      color: COLORS.text,
    },
    detailsMuted: {
      color: COLORS.textSecondary,
      fontStyle: "italic",
    },
    photo: {
      marginTop: SPACING.md,
    },
    footer: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.borderMuted,
      backgroundColor: COLORS.surface,
    },
    // Decline | Accept side by side; RButton keeps its own bottom margin.
    pendingActions: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACING.sm,
    },
    actionButton: {
      flex: 1,
    },
    viewOnly: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      backgroundColor: COLORS.surface,
    },
    viewOnlyText: {
      flex: 1,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      lineHeight: 19,
    },
  });
}
