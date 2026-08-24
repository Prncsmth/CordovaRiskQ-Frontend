import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useThemeColors, RADIUS, SHADOW_LG, type ColorPalette } from "@/theme";

export default function ProfileAvatarEdit() {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ring}
      >
        <View style={styles.circle}>
          <Ionicons name="person-outline" size={52} color={COLORS.primary} />
        </View>
      </LinearGradient>

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <Ionicons name="camera" size={16} color={COLORS.white} />
      </LinearGradient>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      alignSelf: "center",
      width: 120,
      height: 120,
    },
    ring: {
      width: 120,
      height: 120,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      ...SHADOW_LG,
    },
    circle: {
      width: 108,
      height: 108,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: COLORS.background,
    },
    badge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: COLORS.background,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
  });
}
