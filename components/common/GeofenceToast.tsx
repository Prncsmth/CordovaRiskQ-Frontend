// components/common/GeofenceToast.tsx
// Small auto-dismissing rejection toast -- used when a map tap lands outside
// Cordova. Unlike GeofenceBlockedModal, this never blocks interaction: the
// map stays fully usable, the toast just confirms why nothing was placed.
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const AUTO_DISMISS_MS = 2500;

// "danger" (default) is the original red warning, e.g. a tap outside
// Cordova. "success" is green with a checkmark, for good news such as an
// incident being resolved -- a red warning look read as something wrong.
export type ToastTone = "danger" | "success";

export function toastAppearance(
  tone: ToastTone,
  COLORS: Pick<ColorPalette, "danger" | "success">,
): { backgroundColor: string; icon: keyof typeof Ionicons.glyphMap } {
  return tone === "success"
    ? { backgroundColor: COLORS.success, icon: "checkmark-circle" }
    : { backgroundColor: COLORS.danger, icon: "warning" };
}

export default function GeofenceToast({
  visible,
  message,
  onDismiss,
  style,
  tone = "danger",
}: {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: ToastTone;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const appearance = toastAppearance(tone, COLORS);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <View style={[styles.pill, { backgroundColor: appearance.backgroundColor }]}>
        <Ionicons name={appearance.icon} size={16} color={COLORS.white} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: SPACING.md,
      right: SPACING.md,
      alignItems: "center",
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
      backgroundColor: COLORS.danger,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      maxWidth: "100%",
      ...SHADOW_LG,
    },
    text: {
      color: COLORS.white,
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      flexShrink: 1,
    },
  });
}
