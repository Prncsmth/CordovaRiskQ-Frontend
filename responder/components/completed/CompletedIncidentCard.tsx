import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getIncidentVisual } from "@/responder/components/shared/incidentVisual";
import type { CompletedIncident } from "@/responder/services/incident.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default function CompletedIncidentCard({ item }: { item: CompletedIncident }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(item.type);

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: `${visual.color}1A` }]}>
        <Ionicons name={visual.icon} size={18} color={visual.color} />
      </View>

      <View style={styles.textCol}>
        <Text style={styles.type} numberOfLines={1}>
          {item.type}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {item.location}
        </Text>
        <Text style={styles.meta}>
          {item.completedDate} · {item.ref}
        </Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      ...SHADOW,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    type: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
    },
    location: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
    meta: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      marginTop: 2,
    },
  });
}
