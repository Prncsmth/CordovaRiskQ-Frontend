// components/responder/IncidentCard.tsx
// Tappable incident row used by the responder Dashboard's incident list.
// Urgency reads from a single signal -- the UrgencyBadge label -- rather
// than stacking a pulsing dot, a colored border, and a gradient badge on
// top of it too; `isNew` shows a small inline dot next to the title for
// incidents that appeared since the dashboard's last poll.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { getIncidentVisual } from "@/responder/components/shared/incidentVisual";
import { responderStatusColor } from "@/responder/components/shared/responderStatusColors";
import UrgencyBadge from "@/responder/components/shared/UrgencyBadge";
import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
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
  onPress,
}: {
  incident: Incident;
  isNew?: boolean;
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

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.card}
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
        <View style={[styles.categoryBadge, { backgroundColor: `${visual.color}1A` }]}>
          <Ionicons name={visual.icon} size={20} color={visual.color} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            {isNew && <View style={styles.newDot} />}
            <Text style={styles.cardTitle} numberOfLines={1}>
              {incident.type}
            </Text>
            <UrgencyBadge urgency={incident.urgency} />
          </View>
          <View style={styles.cardLocationRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color={COLORS.textSecondary}
            />
            <Text style={styles.cardLocation} numberOfLines={1}>
              {incident.location}
            </Text>
          </View>
          <View style={styles.cardMetaRow}>
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
              {`${formatRelativeTime(incident.createdAt).toLowerCase()} · `}
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
      padding: SPACING.sm + 2,
      gap: SPACING.sm,
      ...SHADOW,
    },
    newDot: {
      width: 7,
      height: 7,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tide,
    },
    categoryBadge: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    cardBody: {
      flex: 1,
      gap: 3,
    },
    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACING.xs,
    },
    cardTitle: {
      flex: 1,
      flexShrink: 1,
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    cardLocationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    cardLocation: {
      // Without this, a long address had no width constraint next to the
      // location icon, so it overflowed past the card's edge instead of
      // wrapping/truncating within the row.
      flex: 1,
      flexShrink: 1,
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
