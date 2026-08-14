import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/theme";
import type { Coordinates } from "@/types/responder";

// Lightweight route preview -- avoids pulling in a live MapView (and the
// API key / native config that requires) until the responder flow is
// wired to real routing.
export default function IncidentMap({
  etaMinutes,
}: {
  responderCoords: Coordinates;
  incidentCoords: Coordinates;
  etaMinutes: number;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.etaPill}>
        <Ionicons name="time-outline" size={14} color={COLORS.white} />
        <Text style={styles.etaText}>ETA {etaMinutes} mins</Text>
      </View>

      <View style={styles.route}>
        <View style={styles.stop}>
          <View style={styles.responderDot}>
            <Ionicons name="navigate" size={14} color={COLORS.white} />
          </View>
          <Text style={styles.stopLabel}>You</Text>
        </View>

        <View style={styles.path} />

        <View style={styles.stop}>
          <View style={styles.incidentPin}>
            <Ionicons name="location" size={16} color={COLORS.white} />
          </View>
          <Text style={styles.stopLabel}>Incident</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    ...SHADOW,
  },
  etaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: SPACING.lg,
  },
  etaText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.small,
  },
  route: {
    flexDirection: "row",
    alignItems: "center",
  },
  stop: {
    alignItems: "center",
    gap: 4,
  },
  responderDot: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  incidentPin: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  path: {
    flex: 1,
    height: 2,
    marginHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  stopLabel: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});
