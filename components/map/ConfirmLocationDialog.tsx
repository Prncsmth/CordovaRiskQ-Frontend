// components/map/ConfirmLocationDialog.tsx
// Confirmation step shown after a pin-drop tap on the Map tab, before the
// point is committed as the report's location -- gives the user a chance to
// see the resolved address and back out ("Choose Again") instead of a single
// tap silently locking in wherever they happened to land.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Dialog,
  DialogIcon,
  DialogMessage,
  DialogTitle,
} from "@/components/common/Dialog";
import { RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function ConfirmLocationDialog({
  address,
  onConfirm,
  onChooseAgain,
}: {
  address: string;
  onConfirm: () => void;
  onChooseAgain: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <Dialog>
        <DialogIcon name="location" />
        <DialogTitle>Confirm This Location?</DialogTitle>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <Text style={styles.address}>{address}</Text>
        </View>
        <DialogMessage>Responders will be sent to this exact spot.</DialogMessage>
        {/* Compact, locally-styled actions instead of the shared
            DialogButton/DialogActions -- those are fixed at 48px tall for
            every dialog in the app; this one specifically needed a smaller,
            tighter footprint, so it's scoped here rather than shrinking
            every other confirmation dialog that wasn't asked for. */}
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={onChooseAgain}>
            <Text style={styles.secondaryButtonText}>Choose Again</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={onConfirm}>
            <Text style={styles.primaryButtonText}>Confirm</Text>
          </Pressable>
        </View>
      </Dialog>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFill,
      zIndex: 200,
      elevation: 200,
    },
    addressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.sm,
    },
    address: {
      flexShrink: 1,
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.text,
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: SPACING.md,
      width: "100%",
    },
    secondaryButton: {
      flex: 1,
      height: 40,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    secondaryButtonText: {
      color: COLORS.text,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.caption,
    },
    primaryButton: {
      flex: 1,
      height: 40,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.primary,
    },
    primaryButtonText: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.caption,
    },
  });
}
