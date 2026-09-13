// components/common/GeofenceBlockedModal.tsx
// Shared blocking overlay for the three Cordova-geofence "you can't proceed"
// states. Built on the shared Dialog pieces in ./Dialog.tsx.
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogIcon,
  DialogMessage,
  DialogTertiaryAction,
  DialogTitle,
} from "@/components/common/Dialog";
import { useThemeColors } from "@/theme";

export type GeofenceModalVariant =
  | "reporting-unavailable"
  | "permission-required"
  | "sos-unavailable";

const COPY: Record<GeofenceModalVariant, { title: string; message: string; icon: keyof typeof Ionicons.glyphMap }> = {
  "reporting-unavailable": {
    title: "Reporting Not Available",
    message:
      "You must be physically within the Municipality of Cordova, Cebu to submit an incident report.",
    icon: "alert-circle",
  },
  "permission-required": {
    title: "Location Permission Required",
    message:
      "CORDOVA RISKQ requires your location to verify that reports are submitted from within Cordova.",
    icon: "location-outline",
  },
  "sos-unavailable": {
    title: "SOS Not Available",
    message: "This feature is only available within the Municipality of Cordova, Cebu.",
    icon: "alert-circle",
  },
};

export default function GeofenceBlockedModal({
  visible,
  variant,
  onDismiss,
  onRetry,
}: {
  visible: boolean;
  variant: GeofenceModalVariant;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(), []);

  if (!visible) return null;

  const copy = COPY[variant];
  const iconColor = variant === "permission-required" ? COLORS.warning : COLORS.danger;

  return (
    <View style={styles.container}>
      <Dialog>
        <DialogIcon name={copy.icon} color={iconColor} />
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogMessage>{copy.message}</DialogMessage>

        {variant === "permission-required" ? (
          <>
            <DialogActions>
              <DialogButton label="Retry" variant="secondary" onPress={onRetry} />
              <DialogButton
                label="Open Settings"
                variant="primary"
                onPress={() => {
                  Linking.openSettings();
                }}
              />
            </DialogActions>
            <DialogTertiaryAction label="Not now" onPress={onDismiss} />
          </>
        ) : (
          <DialogActions>
            <DialogButton label="OK" variant="primary" onPress={onDismiss} />
          </DialogActions>
        )}
      </Dialog>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFill,
      zIndex: 200,
      elevation: 200,
    },
  });
}
