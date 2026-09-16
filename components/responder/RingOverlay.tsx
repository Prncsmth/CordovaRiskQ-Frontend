// components/responder/RingOverlay.tsx
// Global "new incident/SOS" popup for responders -- mounted once in
// app/_layout.tsx, next to SosOverlay, so it can appear over any responder
// screen. Driven entirely by ResponderAlertContext; this component only
// renders what that context says.
import React, { useMemo } from "react";
import { Modal, StyleSheet, Text } from "react-native";

import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogIcon,
  DialogMessage,
  DialogTitle,
} from "@/components/common/Dialog";
import { useResponderAlert } from "@/context/ResponderAlertContext";
import type { Urgency } from "@/responder/types/responder";
import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
import { formatRelativeTime } from "@/utils/formatter";

// Same vivid, fixed palette used for notification icons (see
// components/notifications/notificationReadDisplay.ts) -- urgency is the
// signal that matters here, so it gets the same "unmistakable at a glance"
// treatment rather than a muted theme color.
const URGENCY_COLOR: Record<Urgency, string> = {
  high: "#EF4444",
  medium: "#F97316",
  low: "#9CA3AF",
};

export default function RingOverlay() {
  const { pendingIncident, accept, decline } = useResponderAlert();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <Modal transparent visible={!!pendingIncident} animationType="fade">
      {pendingIncident && (
        <Dialog>
          <DialogIcon
            name="alert-circle"
            color={URGENCY_COLOR[pendingIncident.urgency]}
          />
          <DialogTitle>New {pendingIncident.type}</DialogTitle>
          <DialogMessage>{pendingIncident.location}</DialogMessage>
          <Text style={styles.time}>{formatRelativeTime(pendingIncident.createdAt)}</Text>
          <DialogActions>
            <DialogButton label="Decline" variant="secondary" onPress={decline} />
            <DialogButton
              label="Accept"
              variant="primary"
              color={URGENCY_COLOR[pendingIncident.urgency]}
              onPress={accept}
            />
          </DialogActions>
        </Dialog>
      )}
    </Modal>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    time: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      marginTop: SPACING.xs,
    },
  });
}
