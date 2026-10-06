// components/responder-contact/ResponderContactCard.tsx
// The primary responder's contact card -- who's coming, one line of detail
// (unit / arrival), and one Call button -- shared by the Track Responder
// map and Report Details so both look and behave the same. Deliberately
// plain, like a driver card. The number itself is never shown: Call opens
// the dialer, and with no number on file the button is disabled and the
// emergency hotlines are offered instead.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import {
  FONT_FAMILY,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import { callResponderAction } from "@/utils/callResponder";

// "Juan Dela Cruz" -> "JD", for the plain initials circle.
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "R"
  );
}

export default function ResponderContactCard({
  name,
  detail,
  mobile,
  style,
  showHotlinesFallback = true,
}: {
  name: string;
  // e.g. "MDRRMO · Arriving in ~6 min"
  detail: string;
  // The contact's saved number, or null when there's none.
  mobile: string | null;
  style?: StyleProp<ViewStyle>;
  // With no number, a citizen is pointed to the emergency hotlines instead.
  // A responder calling a reporter has no use for that link, so it's off there.
  showHotlinesFallback?: boolean;
}) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const callAction = callResponderAction(mobile);
  const canCall = callAction.kind === "call";

  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={styles.initials}>
          <Text style={styles.initialsText}>{initialsOf(name)}</Text>
        </View>

        <View style={styles.textCol}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => {
            if (callAction.kind === "call") void Linking.openURL(callAction.telUrl);
          }}
          disabled={!canCall}
          style={({ pressed }) => [
            styles.callButton,
            !canCall && styles.callButtonDisabled,
            pressed && styles.callButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCall }}
          accessibilityLabel={canCall ? `Call ${name}` : "Call unavailable: no contact number"}
        >
          <Ionicons name="call" size={20} color={canCall ? COLORS.white : COLORS.textTertiary} />
        </Pressable>
      </View>

      {!canCall && (
        <View style={styles.unavailableRow}>
          <Text style={styles.unavailableText} numberOfLines={1}>
            No contact number available.
          </Text>
          {showHotlinesFallback ? (
          <Pressable
            onPress={() => router.push("/contacts")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open emergency hotlines"
          >
            <Text style={styles.hotlineLinkText}>Emergency hotlines</Text>
          </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    initials: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    initialsText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
    },
    detail: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    callButton: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.success,
      alignItems: "center",
      justifyContent: "center",
    },
    callButtonDisabled: {
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    callButtonPressed: {
      opacity: 0.8,
    },
    unavailableRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACING.sm,
      marginTop: SPACING.sm,
      paddingTop: SPACING.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
    },
    unavailableText: {
      flexShrink: 1,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
    hotlineLinkText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "600",
      color: COLORS.primary,
    },
  });
}
