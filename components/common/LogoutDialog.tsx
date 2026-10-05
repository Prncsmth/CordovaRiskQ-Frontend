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
import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

type Role = "citizen" | "responder";

// What actually stops on this phone once logged out (see AuthContext's
// logout: the session and the push token are both cleared).
function consequences(role: Role, isOnDuty: boolean): string[] {
  if (role === "responder") {
    return [
      "You won't get new incident alerts on this phone.",
      "Live location sharing for incidents you're responding to stops.",
      ...(isOnDuty
        ? ["You'll still show as On Duty until you switch it off -- turn it off first if you're done for the day."]
        : []),
    ];
  }
  return [
    "You won't get notifications about your reports or SOS.",
    "Tracking a responder on the way to you stops.",
    "You'll need to log in again to send an SOS or a report.",
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
  const items = consequences(role, isOnDuty);

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
        <Text style={styles.lead}>On this phone, after you log out:</Text>
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item} style={styles.item}>
              <Ionicons name="remove-circle-outline" size={16} color={COLORS.primary} style={styles.itemIcon} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
        {role === "citizen" ? (
          <Text style={styles.note}>Your reports stay saved to your account.</Text>
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
    lead: {
      alignSelf: "stretch",
      fontSize: TYPOGRAPHY.small,
      fontWeight: "600",
      color: COLORS.textSecondary,
      marginTop: SPACING.xs,
    },
    list: {
      alignSelf: "stretch",
      gap: SPACING.xs,
      marginTop: SPACING.xs,
    },
    item: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACING.xs,
    },
    itemIcon: {
      marginTop: 2,
    },
    itemText: {
      flex: 1,
      fontSize: TYPOGRAPHY.small,
      lineHeight: 19,
      color: COLORS.text,
    },
    note: {
      alignSelf: "stretch",
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      marginTop: SPACING.sm,
    },
  });
}
