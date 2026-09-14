// components/map/ConfirmLocationDialog.tsx
// Confirmation step shown after a pin-drop tap on the Map tab, before the
// point is committed as the report's location -- gives the user a chance to
// see the resolved address and back out ("Choose Again") instead of a single
// tap silently locking in wherever they happened to land.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogIcon,
  DialogMessage,
  DialogTitle,
} from "@/components/common/Dialog";
import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

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
        <DialogActions>
          <DialogButton label="Choose Again" variant="secondary" onPress={onChooseAgain} />
          <DialogButton label="Confirm Location" variant="primary" onPress={onConfirm} />
        </DialogActions>
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
  });
}
