// components/sos/SosOverlay.tsx
// Global overlay for the confirm/active SOS states. Mounted once in
// app/_layout.tsx above the tab navigator so it appears over whichever
// screen the user is on, matching the tab bar's own `stage !== "idle"`
// hide behavior in components/tabs/TabBar.tsx.
import { Ionicons } from "@expo/vector-icons";
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
import { useAuth } from "@/context/AuthContext";
import { useSos } from "@/context/SosContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

export default function SosOverlay() {
  const { token } = useAuth();
  const {
    stage,
    blockedReason,
    isMinimized,
    confirmSOS,
    cancelSOS,
    expandSOS,
    minimizeSOS,
    dismissBlocked,
    retryConfirm,
  } = useSos();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

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
            <ActiveView onCancel={cancelSOS} onMinimize={minimizeSOS} COLORS={COLORS} styles={styles} />
          )}
        </View>
      )}

      {stage === "active" && isMinimized && (
        <MinimizedBanner onPress={expandSOS} COLORS={COLORS} styles={styles} />
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

function LoadingView({ COLORS, message }: { COLORS: ColorPalette; message: string }) {
  return (
    <Dialog>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <DialogTitle style={{ marginTop: SPACING.sm }}>{message}</DialogTitle>
    </Dialog>
  );
}

function MinimizedBanner({
  onPress,
  COLORS,
  styles,
}: {
  onPress: () => void;
  COLORS: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      style={[styles.minimizedBanner, { top: insets.top + SPACING.sm }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="SOS active, responders notified. Tap to view status."
    >
      <Ionicons name="warning" size={16} color={COLORS.white} />
      <Text style={styles.minimizedBannerText} numberOfLines={1}>
        SOS Active — Responders Notified
      </Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
    </Pressable>
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
  onMinimize,
  COLORS,
  styles,
}: {
  onCancel: () => void;
  onMinimize: () => void;
  COLORS: ColorPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const insets = useSafeAreaInsets();

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
    minimizedBanner: {
      position: "absolute",
      left: SPACING.md,
      right: SPACING.md,
      zIndex: 100,
      elevation: 100,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    minimizedBannerText: {
      flex: 1,
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.small,
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
