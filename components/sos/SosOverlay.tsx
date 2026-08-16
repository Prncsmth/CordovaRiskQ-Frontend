// components/sos/SosOverlay.tsx
// Global overlay for the confirm/active SOS states. Mounted once in
// app/_layout.tsx above the tab navigator so it appears over whichever
// screen the user is on, matching the tab bar's own `stage !== "idle"`
// hide behavior in components/tabs/TabBar.tsx.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RippleRings from "@/components/common/RippleRings";
import { useSos } from "@/context/SosContext";
import { COLORS, FONT_FAMILY, RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY } from "@/theme";

export default function SosOverlay() {
  const { stage, confirmSOS, cancelSOS } = useSos();

  if (stage === "idle") return null;

  return (
    <View style={styles.container}>
      {stage === "confirm" ? (
        <ConfirmView onConfirm={confirmSOS} onCancel={cancelSOS} />
      ) : (
        <ActiveView onCancel={cancelSOS} />
      )}
    </View>
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
    <View style={styles.backdrop}>
      <View style={styles.dialog}>
        <View style={styles.dialogIcon}>
          <Ionicons name="warning" size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.dialogTitle}>Send Emergency SOS?</Text>
        <Text style={styles.dialogMessage}>
          Emergency responders will be notified with your current location.
          Only do this in a real emergency.
        </Text>

        <View style={styles.dialogActions}>
          <Pressable
            style={[styles.dialogButton, styles.dialogButtonSecondary]}
            onPress={onCancel}
          >
            <Text style={styles.dialogButtonSecondaryText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.dialogButton, styles.dialogButtonPrimary]}
            onPress={onConfirm}
          >
            <Text style={styles.dialogButtonPrimaryText}>Send SOS</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ActiveView({ onCancel }: { onCancel: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.activeScreen, { paddingBottom: insets.bottom + SPACING.lg }]}>
      <View style={styles.activeBody}>
        <PulseRings />
        <Text style={styles.activeTitle}>Help Is On The Way</Text>
        <Text style={styles.activeSubtitle}>
          Your location has been shared with emergency responders.
        </Text>

        <View style={styles.etaPill}>
          <Ionicons name="time-outline" size={16} color={COLORS.white} />
          <Text style={styles.etaText}>Estimated arrival: ~8 mins</Text>
        </View>
      </View>

      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel SOS</Text>
      </Pressable>
    </View>
  );
}

const RING_SIZE = 170;

function PulseRings() {
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

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  dialog: {
    width: "100%",
    backgroundColor: COLORS.white,
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
  etaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
  },
  etaText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: TYPOGRAPHY.caption,
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
