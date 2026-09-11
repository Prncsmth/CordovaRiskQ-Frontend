// components/responder/IncidentCard.tsx
// Tappable incident row used by the responder Dashboard's incident list.
// High-urgency incidents get a soft pulsing accent on their category
// badge so the most critical incidents are scannable at a glance, not
// just color-coded; `isNew` shows a small pill for incidents that
// appeared since the dashboard's last poll.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { getIncidentVisual } from "@/responder/components/shared/incidentVisual";
import { responderStatusColor } from "@/responder/components/shared/responderStatusColors";
import UrgencyBadge from "@/responder/components/shared/UrgencyBadge";
import { RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
import type { Incident, ResponderStatus } from "@/responder/types/responder";
import { formatRelativeTime } from "@/utils/formatter";

// Only these three roster statuses get a "my status" chip on the card --
// "pending" (never joined) shows no chip at all, so it doesn't compete
// with the unrelated freshness "NEW" pill above; "declined"/"left" never
// reach this list in the first place (see services/incident.service.ts).
const MY_STATUS_LABELS: Record<ResponderStatus, string> = {
  joined: "Joined",
  on_the_way: "On the Way",
  arrived: "Arrived",
};

function myStatusMeta(incident: Incident): ResponderStatus | undefined {
  switch (incident.myStatus) {
    case "joined":
    case "on_the_way":
    case "arrived":
      return incident.myStatus;
    default:
      return undefined;
  }
}

export default function IncidentCard({
  incident,
  isNew,
  firstSeenAt,
  onPress,
}: {
  incident: Incident;
  isNew?: boolean;
  firstSeenAt: number;
  onPress: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);
  const myStatus = myStatusMeta(incident);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (incident.urgency !== "high") return;
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [incident.urgency, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.65,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.card, { borderLeftColor: visual.color }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        <View
          style={[
            styles.categoryBadge,
            {
              backgroundColor: `${visual.color}1A`,
              borderColor: `${visual.color}33`,
            },
          ]}
        >
          <Ionicons name={visual.icon} size={22} color={visual.color} />
          {incident.urgency === "high" && (
            <Animated.View
              style={[styles.pulseDot, { backgroundColor: visual.color }, pulseStyle]}
            />
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{incident.type}</Text>
          <View style={styles.cardLocationRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color={COLORS.textSecondary}
            />
            <Text style={styles.cardLocation}>{incident.location}</Text>
          </View>
          <View style={styles.cardMetaRow}>
            <UrgencyBadge urgency={incident.urgency} />
            {myStatus && (
              <View
                style={[
                  styles.myStatusChip,
                  { backgroundColor: `${responderStatusColor(COLORS, myStatus)}1A` },
                ]}
              >
                <View
                  style={[
                    styles.myStatusDot,
                    { backgroundColor: responderStatusColor(COLORS, myStatus) },
                  ]}
                />
                <Text
                  style={[
                    styles.myStatusLabel,
                    { color: responderStatusColor(COLORS, myStatus) },
                  ]}
                >
                  {MY_STATUS_LABELS[myStatus]}
                </Text>
              </View>
            )}
            <Text style={styles.cardDistance}>
              {firstSeenAt > 0
                ? `${formatRelativeTime(new Date(firstSeenAt)).toLowerCase()} · `
                : ""}
              {incident.distanceKm != null
                ? `${incident.distanceKm.toFixed(1)} km`
                : "Distance unknown"}
              {incident.etaMinutes ? ` · ${incident.etaMinutes} min` : ""}
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textTertiary}
        />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderLeftWidth: 4,
      padding: SPACING.md,
      gap: SPACING.sm,
      ...SHADOW_LG,
    },
    newBadge: {
      position: "absolute",
      top: -6,
      right: SPACING.md,
      backgroundColor: COLORS.tide,
      borderRadius: RADIUS.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      zIndex: 1,
    },
    newBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.4,
      color: COLORS.white,
    },
    categoryBadge: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    pulseDot: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 10,
      height: 10,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      borderColor: COLORS.background,
    },
    cardBody: {
      flex: 1,
      gap: 3,
    },
    cardTitle: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.text,
    },
    cardLocationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    cardLocation: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
    },
    cardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: SPACING.sm,
      rowGap: 4,
      marginTop: 2,
    },
    myStatusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: RADIUS.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    myStatusDot: {
      width: 5,
      height: 5,
      borderRadius: RADIUS.full,
    },
    myStatusLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
    cardDistance: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      fontWeight: "600",
    },
  });
}
