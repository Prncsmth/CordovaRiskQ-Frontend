// components/responder/QueuedAlertBadge.tsx
// Informational-only banner ("🔴 N New Incident(s) Waiting") shown while a
// responder is busy with an active incident (or anywhere else) and one or
// more new incidents have come in without interrupting them -- see
// ResponderAlertContext for the queue/reveal logic. Purely a heads-up; it
// doesn't do anything on tap, since forcing the popup up while the
// responder is still busy would defeat the point of queuing it.
import React from "react";
import { StyleSheet, StyleProp, Text, View, ViewStyle } from "react-native";

import { useResponderAlert } from "@/context/ResponderAlertContext";
import { RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

// Fixed, not theme-derived -- same reasoning as RingOverlay's URGENCY_COLOR:
// this needs to read as "alert red" consistently, not the app's muted
// COLORS.danger.
const RED = "#EF4444";

export default function QueuedAlertBadge({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  const { queuedCount } = useResponderAlert();

  if (queuedCount === 0) return null;

  return (
    <View style={[styles.badge, style]}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        {queuedCount} New Incident{queuedCount === 1 ? "" : "s"} Waiting
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: `${RED}1A`,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: RED,
  },
  text: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: RED,
  },
});
