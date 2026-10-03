import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, RADIUS, TYPOGRAPHY, type ColorPalette } from "@/theme";
import { getPasswordRequirements } from "@/utils/passwordPolicy";

// Two columns instead of one tall stacked list -- 5 requirements read as a
// compact grid in roughly the same height as 3 stacked rows, and a filled
// (not just outlined) checkmark badge reads as a real "done" state rather
// than a plain icon-color swap, matching the solid-badge treatment used
// elsewhere in the app (e.g. RegistrationCompleteScreen's success circle).
export default function PasswordRequirements({ password }: { password: string }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (!password) return null;

  const requirements = getPasswordRequirements(password);

  return (
    <View style={styles.grid}>
      {requirements.map((req) => (
        <View key={req.key} style={styles.item}>
          <View style={[styles.badge, req.met && styles.badgeMet]}>
            <Ionicons
              name={req.met ? "checkmark" : "ellipse-outline"}
              size={11}
              color={req.met ? COLORS.white : COLORS.textTertiary}
            />
          </View>
          <Text style={[styles.label, req.met && styles.labelMet]} numberOfLines={1}>
            {req.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 8,
    },
    item: {
      width: "50%",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingRight: 4,
    },
    badge: {
      width: 18,
      height: 18,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.borderMuted,
    },
    badgeMet: {
      backgroundColor: COLORS.success,
    },
    label: {
      flexShrink: 1,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
    labelMet: {
      color: COLORS.text,
      fontWeight: "600",
    },
  });
}
