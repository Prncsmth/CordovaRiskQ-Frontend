// components/common/GeofenceBlockedModal.tsx
// Shared blocking overlay for the three Cordova-geofence "you can't proceed"
// states. Follows the same backdrop+dialog visual pattern as
// components/sos/SosOverlay.tsx's ConfirmView.
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

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
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (!visible) return null;

  const copy = COPY[variant];
  const iconColor = variant === "permission-required" ? COLORS.warning : COLORS.danger;

  return (
    <View style={styles.container}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.dialogIcon}>
            <Ionicons name={copy.icon} size={28} color={iconColor} />
          </View>
          <Text style={styles.dialogTitle}>{copy.title}</Text>
          <Text style={styles.dialogMessage}>{copy.message}</Text>

          {variant === "permission-required" ? (
            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogButton, styles.dialogButtonSecondary]}
                onPress={onRetry}
              >
                <Text style={styles.dialogButtonSecondaryText}>Retry</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={() => {
                  Linking.openSettings();
                }}
              >
                <Text style={styles.dialogButtonPrimaryText}>Open Settings</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.dialogActions}>
              <Pressable
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={onDismiss}
              >
                <Text style={styles.dialogButtonPrimaryText}>OK</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
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
    backdrop: {
      flex: 1,
      backgroundColor: COLORS.scrim,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
    },
    dialog: {
      width: "100%",
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      alignItems: "center",
      ...SHADOW_LG,
    },
    dialogIcon: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.sm,
    },
    dialogTitle: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
      textAlign: "center",
    },
    dialogMessage: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.xs,
      lineHeight: 20,
    },
    dialogActions: {
      flexDirection: "row",
      gap: SPACING.sm,
      marginTop: SPACING.lg,
      width: "100%",
    },
    dialogButton: {
      flex: 1,
      height: 48,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
    },
    dialogButtonSecondary: {
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    dialogButtonSecondaryText: {
      color: COLORS.text,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.body,
    },
    dialogButtonPrimary: {
      backgroundColor: COLORS.primary,
    },
    dialogButtonPrimaryText: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.body,
    },
  });
}
