// components/common/LogoutDialog.tsx
// The Log Out confirmation, shared by the citizen Profile tab and Settings
// (the responder's only account screen). Before logging out it spells out
// what stops working on this phone -- different for a citizen and a
// responder -- so nobody logs out not realising they'll miss report updates
// or incident alerts.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogIcon,
  DialogTitle,
} from "@/components/common/Dialog";
import { RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

type Role = "citizen" | "responder";

type Consequence = { icon: keyof typeof Ionicons.glyphMap; text: string };

// What actually stops on this phone once logged out (see AuthContext's
// logout: the session and the push token are both cleared).
function consequences(role: Role): Consequence[] {
  if (role === "responder") {
    return [
      { icon: "notifications-off-outline", text: "New incident alerts stop on this phone." },
      { icon: "location-outline", text: "Live location sharing for your active incidents stops." },
    ];
  }
  return [
    { icon: "notifications-off-outline", text: "Updates about your reports and SOS stop." },
    { icon: "navigate-outline", text: "Tracking a responder on the way to you stops." },
    { icon: "lock-closed-outline", text: "You'll need to log in again to send an SOS or a report." },
  ];
}

export default function LogoutDialog({
  visible,
  role,
  isOnDuty = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  role: Role;
  isOnDuty?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [busy, setBusy] = useState(false);
  const items = consequences(role);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <Dialog>
        <DialogIcon name="log-out-outline" color={COLORS.primary} />
        <DialogTitle>Log out?</DialogTitle>
        <Text style={styles.subtitle}>You can log back in anytime.</Text>

        {/* What stops on this phone, as one tidy panel. */}
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>After you log out</Text>
          {items.map((item) => (
            <View key={item.text} style={styles.item}>
              {/* Same red-on-tint icon circles as the Profile and Settings rows. */}
              <View style={styles.itemIcon}>
                <Ionicons name={item.icon} size={15} color={COLORS.primary} />
              </View>
              <Text style={styles.itemText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Logging out doesn't switch duty off -- the one thing a responder
            must act on, so it's its own callout rather than another line. */}
        {role === "responder" && isOnDuty ? (
          <View style={styles.dutyCallout}>
            <Ionicons name="radio-button-on" size={18} color={COLORS.primary} style={styles.calloutIcon} />
            <View style={styles.calloutTextCol}>
              <Text style={styles.calloutTitle}>You&apos;re still On Duty</Text>
              <Text style={styles.calloutText}>
                Logging out won&apos;t switch it off. Done for the day? Tap{" "}
                <Text style={styles.calloutStrong}>On Duty</Text> on the Dashboard first.
              </Text>
            </View>
          </View>
        ) : null}

        {role === "citizen" ? (
          <View style={styles.note}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
            <Text style={styles.noteText}>Your reports stay saved to your account.</Text>
          </View>
        ) : null}

        <DialogActions>
          <DialogButton
            label="Cancel"
            variant="secondary"
            onPress={() => {
              if (!busy) onCancel();
            }}
          />
          <DialogButton label={busy ? "Logging out…" : "Log Out"} variant="primary" onPress={confirm} />
        </DialogActions>
      </Dialog>
    </Modal>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    subtitle: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.xs,
    },
    panel: {
      alignSelf: "stretch",
      marginTop: SPACING.md,
      padding: SPACING.md,
      gap: SPACING.sm + 2,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
    },
    panelLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "600",
      color: COLORS.textSecondary,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    itemIcon: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    itemText: {
      flex: 1,
      fontSize: TYPOGRAPHY.small,
      lineHeight: 19,
      color: COLORS.text,
    },
    dutyCallout: {
      alignSelf: "stretch",
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: SPACING.sm,
      padding: SPACING.md,
      backgroundColor: COLORS.primaryTint,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: `${COLORS.primary}33`,
    },
    calloutIcon: {
      marginTop: 1,
    },
    calloutTextCol: {
      flex: 1,
      gap: 2,
    },
    calloutTitle: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "800",
      color: COLORS.text,
    },
    calloutText: {
      fontSize: TYPOGRAPHY.small,
      lineHeight: 19,
      color: COLORS.textSecondary,
    },
    calloutStrong: {
      fontWeight: "800",
      color: COLORS.text,
    },
    note: {
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: SPACING.sm,
    },
    noteText: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
  });
}
