import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, TYPOGRAPHY, type ColorPalette } from "@/theme";
import { getPasswordRequirements } from "@/utils/passwordPolicy";

export default function PasswordRequirements({ password }: { password: string }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (!password) return null;

  const requirements = getPasswordRequirements(password);

  return (
    <View style={styles.wrapper}>
      {requirements.map((req) => (
        <View key={req.key} style={styles.row}>
          <Ionicons
            name={req.met ? "checkmark-circle" : "ellipse-outline"}
            size={14}
            color={req.met ? COLORS.success : COLORS.textTertiary}
          />
          <Text style={[styles.label, req.met && { color: COLORS.text }]}>
            {req.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrapper: {
      gap: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
  });
}
