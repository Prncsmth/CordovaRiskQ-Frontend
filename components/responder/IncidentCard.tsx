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

import { getIncidentVisual } from "@/components/responder/incidentVisual";
import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
import type { Incident } from "@/types/responder";
import { formatRelativeTime } from "@/utils/formatter";

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
      gap: SPACING.sm,
      marginTop: 2,
    },
    cardDistance: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      fontWeight: "600",
    },
  });
}
