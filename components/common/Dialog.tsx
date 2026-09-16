// components/common/Dialog.tsx
// Shared backdrop+card visual shell for blocking confirmation dialogs.
// Extracted from SosOverlay's ConfirmView and GeofenceBlockedModal, which
// duplicated this exact backdrop/dialog/icon/title/message/actions/button
// markup and styling.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";

import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export function Dialog({ children }: { children: React.ReactNode }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.backdrop}>
      <View style={styles.dialog}>{children}</View>
    </View>
  );
}

export function DialogIcon({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.dialogIcon}>
      <Ionicons name={name} size={28} color={color ?? COLORS.primary} />
    </View>
  );
}

export function DialogTitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return <Text style={[styles.dialogTitle, style]}>{children}</Text>;
}

export function DialogMessage({ children }: { children: React.ReactNode }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return <Text style={styles.dialogMessage}>{children}</Text>;
}

export function DialogActions({ children }: { children: React.ReactNode }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return <View style={styles.dialogActions}>{children}</View>;
}

export function DialogButton({
  label,
  onPress,
  variant = "primary",
  color,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  // Overrides the primary variant's default red brand color -- for
  // confirmations that aren't a danger/brand action (e.g. a green "Mark
  // Resolved" success confirm), so the button doesn't misleadingly read as
  // a destructive/alert action.
  color?: string;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const isPrimary = variant === "primary";
  return (
    <Pressable
      style={[
        styles.dialogButton,
        isPrimary
          ? [styles.dialogButtonPrimary, color ? { backgroundColor: color } : null]
          : styles.dialogButtonSecondary,
      ]}
      onPress={onPress}
    >
      <Text
        style={isPrimary ? styles.dialogButtonPrimaryText : styles.dialogButtonSecondaryText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DialogTertiaryAction({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <Pressable style={styles.dialogTertiaryAction} onPress={onPress}>
      <Text style={styles.dialogTertiaryActionText}>{label}</Text>
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
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
    dialogTertiaryAction: {
      marginTop: SPACING.sm,
      paddingVertical: SPACING.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    dialogTertiaryActionText: {
      color: COLORS.textSecondary,
      fontWeight: "600",
      fontSize: TYPOGRAPHY.caption,
    },
  });
}
