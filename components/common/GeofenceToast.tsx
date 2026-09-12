// components/common/GeofenceToast.tsx
// Small auto-dismissing rejection toast -- used when a map tap lands outside
// Cordova. Unlike GeofenceBlockedModal, this never blocks interaction: the
// map stays fully usable, the toast just confirms why nothing was placed.
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { RADIUS, SHADOW_LG, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const AUTO_DISMISS_MS = 2500;

export default function GeofenceToast({
  visible,
  message,
  onDismiss,
  style,
}: {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <View style={styles.pill}>
        <Ionicons name="warning" size={16} color={COLORS.white} />
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
