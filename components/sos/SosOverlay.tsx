// components/sos/SosOverlay.tsx
// Global overlay for the confirm/active SOS states. Mounted once in
// app/_layout.tsx above the tab navigator so it appears over whichever
// screen the user is on, matching the tab bar's own `stage !== "idle"`
// hide behavior in components/tabs/TabBar.tsx.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import GeofenceToast from "@/components/common/GeofenceToast";
import RippleRings from "@/components/common/RippleRings";
import SosBubble from "@/components/sos/SosBubble";
import { useAuth } from "@/context/AuthContext";
import { useSos, type SosTrackingState } from "@/context/SosContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

export default function SosOverlay() {
  const { token } = useAuth();
  const {
    stage,
    blockedReason,
    isMinimized,
    incidentId,
    tracking,
    showAssignedToast,
    showResolvedToast,
    confirmSOS,
    cancelSOS,
    expandSOS,
    minimizeSOS,
    dismissBlocked,
    retryConfirm,
    dismissAssignedToast,
    dismissResolvedToast,
  } = useSos();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();

  // Belt-and-suspenders: SosContext already wipes its own state on logout,
  // but this guarantees nothing SOS-related ever renders while logged out,
  // even for a stray frame -- an emergency status is for the signed-in
  // account's own eyes only, never the login screen or a different account
  // that logs in next on the same device.
  if (!token) return null;

  const blockedVariant: GeofenceModalVariant | null =
    blockedReason === "permission"
      ? "permission-required"
      : blockedReason === "unavailable"
        ? "sos-unavailable"
        : null;

  const showFullScreen = stage !== "idle" && !(stage === "active" && isMinimized);

  return (
    <>
      {showFullScreen && (
        <View style={styles.container}>
          {stage === "confirm" ? (
            <ConfirmView onConfirm={confirmSOS} onCancel={cancelSOS} />
          ) : stage === "verifying" ? (
            <LoadingView COLORS={COLORS} message="Getting your accurate location..." />
          ) : stage === "sending" ? (
            <LoadingView COLORS={COLORS} message="Sending your SOS alert..." />
          ) : (
            <ActiveView
              incidentId={incidentId}
              tracking={tracking}
              onTrack={(id) =>
                router.push({ pathname: "/track-responder/[id]", params: { id } })
              }
              onCancel={cancelSOS}
              onMinimize={minimizeSOS}
              onBackToHome={() => {
                minimizeSOS();
                router.push("/(tabs)/home");
              }}
              COLORS={COLORS}
              styles={styles}
            />
          )}
        </View>
      )}

      {stage === "active" && isMinimized && <SosBubble onPress={expandSOS} />}

      <GeofenceBlockedModal
        visible={blockedVariant !== null}
        variant={blockedVariant ?? "sos-unavailable"}
        onDismiss={dismissBlocked}
        onRetry={retryConfirm}
      />

      <GeofenceToast
        visible={showAssignedToast}
        message="Responder Assigned"
        onDismiss={dismissAssignedToast}
        style={{ top: insets.top + SPACING.sm }}
      />

      <GeofenceToast
        visible={showResolvedToast}
        message="Incident Resolved"
        onDismiss={dismissResolvedToast}
        style={{ top: insets.top + SPACING.sm }}
      />
    </>
  );
}

function LoadingView({ COLORS, message }: { COLORS: ColorPalette; message: string }) {
  return (
    <Dialog>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <DialogTitle style={{ marginTop: SPACING.sm }}>{message}</DialogTitle>
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
  incidentId,
  tracking,
  onTrack,
  onCancel,
  onMinimize,
  onBackToHome,
  COLORS,
  styles,
}: {
  incidentId: string | null;
  tracking: SosTrackingState;
  onTrack: (incidentId: string) => void;
  onCancel: () => void;
  onMinimize: () => void;
  onBackToHome: () => void;
  COLORS: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const insets = useSafeAreaInsets();
  // Treat the brief "idle" frame before the tracking poll's first tick
  // lands the same as "waiting" -- stage is already "active" by the time
  // this view renders, so there's always really an incident to wait on.
  const isAssigned = tracking.kind === "live";
  const responderName = tracking.kind === "live" ? tracking.snapshot.responderName : null;

  return (
    <View style={[styles.activeScreen, { paddingBottom: insets.bottom + SPACING.lg }]}>
      <View style={[styles.activeHeader, { top: insets.top + SPACING.sm }]}>
        <Pressable
          style={styles.minimizeButton}
          onPress={onMinimize}
          accessibilityRole="button"
          accessibilityLabel="Minimize"
        >
          <Ionicons name="chevron-down" size={20} color={COLORS.white} />
        </Pressable>
      </View>

      <View style={styles.activeBody}>
        <View style={styles.sentBadge}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
          <Text style={styles.sentBadgeText}>SOS sent successfully</Text>
        </View>
        <PulseRings styles={styles} />
        <Text style={styles.activeTitle}>
          {isAssigned ? "Responder Assigned" : "Waiting for Responder"}
        </Text>
        <Text style={styles.activeSubtitle}>
          {isAssigned
            ? `${responderName ?? "A responder"} has been assigned and is on the way.`
            : "Your SOS has been sent. Please wait while a responder accepts your request."}
        </Text>
      </View>

      {incidentId && isAssigned && (
        <Pressable style={styles.trackButton} onPress={() => onTrack(incidentId)}>
          <Ionicons name="navigate" size={18} color={COLORS.primary} />
          <Text style={styles.trackButtonText}>Track Responder</Text>
        </Pressable>
      )}

      {isAssigned ? (
        <Pressable style={styles.cancelButton} onPress={onBackToHome}>
          <Text style={styles.cancelButtonText}>Back to Home</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel SOS</Text>
        </Pressable>
      )}
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
    activeHeader: {
      position: "absolute",
      right: SPACING.lg,
      alignItems: "flex-end",
    },
    minimizeButton: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      alignItems: "center",
      justifyContent: "center",
    },
    activeBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
    },
    sentBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      marginBottom: SPACING.md,
    },
    sentBadgeText: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.caption,
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
    trackButton: {
      width: "100%",
      height: 52,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.white,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.xs,
      marginBottom: SPACING.sm,
    },
    trackButtonText: {
      color: COLORS.primary,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.body,
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
