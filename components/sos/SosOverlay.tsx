// components/sos/SosOverlay.tsx
// Global overlay for the confirm/active SOS states. Mounted once in
// app/_layout.tsx above the tab navigator so it appears over whichever
// screen the user is on, matching the tab bar's own `stage !== "idle"`
// hide behavior in components/tabs/TabBar.tsx.
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogIcon,
  DialogMessage,
  DialogTitle,
} from "@/components/common/Dialog";
import GeofenceBlockedModal, { type GeofenceModalVariant } from "@/components/common/GeofenceBlockedModal";
import RippleRings from "@/components/common/RippleRings";
import { useSos } from "@/context/SosContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

export default function SosOverlay() {
  const { stage, blockedReason, confirmSOS, cancelSOS, dismissBlocked, retryConfirm } = useSos();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const blockedVariant: GeofenceModalVariant | null =
    blockedReason === "permission"
      ? "permission-required"
      : blockedReason === "unavailable"
        ? "sos-unavailable"
        : null;

  return (
    <>
      {stage !== "idle" && (
        <View style={styles.container}>
          {stage === "confirm" ? (
            <ConfirmView onConfirm={confirmSOS} onCancel={cancelSOS} />
          ) : stage === "verifying" ? (
            <VerifyingView COLORS={COLORS} />
          ) : (
            <ActiveView onCancel={cancelSOS} COLORS={COLORS} styles={styles} />
          )}
        </View>
      )}

      <GeofenceBlockedModal
        visible={blockedVariant !== null}
        variant={blockedVariant ?? "sos-unavailable"}
        onDismiss={dismissBlocked}
        onRetry={retryConfirm}
      />
    </>
  );
}

function VerifyingView({ COLORS }: { COLORS: ColorPalette }) {
  return (
    <Dialog>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <DialogTitle style={{ marginTop: SPACING.sm }}>
        Getting your accurate location...
      </DialogTitle>
    </Dialog>
  );
}

function ConfirmView({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog>
      <DialogIcon name="warning" />
      <DialogTitle>Send Emergency SOS?</DialogTitle>
      <DialogMessage>
        Emergency responders will be notified with your current location.
        Only do this in a real emergency.
      </DialogMessage>
      <DialogActions>
        <DialogButton label="Cancel" variant="secondary" onPress={onCancel} />
        <DialogButton label="Send SOS" variant="primary" onPress={onConfirm} />
      </DialogActions>
    </Dialog>
  );
}

function ActiveView({
  onCancel,
  COLORS,
  styles,
}: {
  onCancel: () => void;
  COLORS: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.activeScreen, { paddingBottom: insets.bottom + SPACING.lg }]}>
      <View style={styles.activeBody}>
        <PulseRings styles={styles} />
        <Text style={styles.activeTitle}>Help Is On The Way</Text>
        <Text style={styles.activeSubtitle}>
          Your location has been shared with emergency responders.
        </Text>
      </View>

      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel SOS</Text>
      </Pressable>
    </View>
  );
}

const RING_SIZE = 170;

function PulseRings({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.pulseWrap}>
      <RippleRings
        size={RING_SIZE}
        ringCount={2}
        animated
        color="rgba(255, 255, 255, 0.35)"
        style={styles.pulseRings}
      />
      <View style={styles.pulseCenter}>
        <Text style={styles.pulseCenterText}>SOS</Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFill,
      zIndex: 100,
      elevation: 100,
    },
    activeScreen: {
      flex: 1,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.lg,
    },
    activeBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
    },
    pulseWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.md,
    },
    pulseRings: {
      position: "absolute",
      top: 0,
      left: 0,
    },
    pulseCenter: {
      width: 100,
      height: 100,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.white,
      alignItems: "center",
      justifyContent: "center",
    },
    pulseCenterText: {
      fontFamily: FONT_FAMILY.display,
      color: COLORS.primary,
      fontSize: TYPOGRAPHY.heading,
      letterSpacing: 1,
    },
    activeTitle: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.heading,
      color: COLORS.white,
      textAlign: "center",
    },
    activeSubtitle: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.white,
      opacity: 0.9,
      textAlign: "center",
      paddingHorizontal: SPACING.md,
    },
    cancelButton: {
      width: "100%",
      height: 52,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: COLORS.white,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.md,
    },
    cancelButtonText: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.body,
    },
  });
}
