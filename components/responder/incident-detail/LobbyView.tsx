// components/responder/incident-detail/LobbyView.tsx
// Phase 2 of the incident-detail flow: the team lobby shown after
// accepting, with a Team Lobby / Details tab switch and a "Head Out"
// action that advances to the On the Way phase.
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getIncidentVisual } from "@/components/responder/incidentVisual";
import RButton from "@/components/responder/RButton";
import TeamMemberRow from "@/components/responder/TeamMemberRow";
import {
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident } from "@/types/responder";

import DetailRow from "./DetailRow";
import GradientIconCircle from "./GradientIconCircle";

export type LobbyTab = "lobby" | "details";

export default function LobbyView({
  incident,
  tab,
  onChangeTab,
  onHeadOut,
}: {
  incident: Incident;
  tab: LobbyTab;
  onChangeTab: (t: LobbyTab) => void;
  onHeadOut: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);
  const [rung, setRung] = useState(false);
  const captain = incident.team.find((m) => m.isCaptain);

  const handleRingTeam = () => {
    if (rung) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRung(true);
    setTimeout(() => setRung(false), 2500);
  };

  return (
    <View style={styles.body}>
      <View style={styles.summaryCard}>
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

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, tab === "lobby" && styles.tabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChangeTab("lobby");
          }}
        >
          <Text
            style={[styles.tabLabel, tab === "lobby" && styles.tabLabelActive]}
          >
            Team Lobby
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tabButton,
            tab === "details" && styles.tabButtonActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChangeTab("details");
          }}
        >
          <Text
            style={[
              styles.tabLabel,
              tab === "details" && styles.tabLabelActive,
            ]}
          >
            Details
          </Text>
        </Pressable>
      </View>

      {tab === "lobby" ? (
        <ScrollView>
          <Text style={styles.sectionLabel}>
            Responders Joined ({incident.team.length}/{incident.maxResponders})
          </Text>
          {incident.team.map((member) => (
            <TeamMemberRow key={member.id} member={member} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView>
          <DetailRow label="Incident ID" value={incident.id} />
          <DetailRow label="Type" value={incident.type} />
          <DetailRow label="Location" value={incident.location} />
          <DetailRow label="Urgency" value={incident.urgency} />
          <DetailRow
            label="Distance"
            value={incident.distanceKm != null ? `${incident.distanceKm.toFixed(1)} km` : "Unknown"}
          />
        </ScrollView>
      )}

      <RButton
        label={rung ? `${captain?.name ?? "Captain"} Alerted` : "Ring Team"}
        variant={rung ? "success" : "secondary"}
        icon={rung ? "checkmark-circle" : "notifications"}
        onPress={handleRingTeam}
      />
      <RButton label="Head Out" variant="primary" onPress={onHeadOut} />
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
    tabRow: {
      flexDirection: "row",
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: 4,
      marginBottom: SPACING.md,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: RADIUS.sm,
      alignItems: "center",
    },
    tabButtonActive: {
      backgroundColor: COLORS.primary,
    },
    tabLabel: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      color: COLORS.textSecondary,
    },
    tabLabelActive: {
      color: COLORS.white,
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
