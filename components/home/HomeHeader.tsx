import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useThemeColors, RADIUS, SPACING, type ColorPalette } from "@/theme";

type HomeHeaderProps = {
  hasUnread: boolean;
};

export default function HomeHeader({ hasUnread }: HomeHeaderProps) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Image
          source={require("@/assets/images/riskq.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.wordmark}>
          <View style={styles.brandLine}>
            <Text style={styles.brandText}>CORD</Text>
            <Image
              source={require("@/assets/images/cordova-logo.png")}
              style={styles.monogram}
              resizeMode="contain"
            />
            <Text style={styles.brandText}>VA</Text>
          </View>
          <View style={styles.riskLine}>
            <Text style={styles.riskText}>RISKQ</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.bell}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/notifications");
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="notifications" size={24} color={COLORS.primary} />
        {hasUnread ? <View style={styles.dot} /> : null}
      </TouchableOpacity>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: SPACING.xs,
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 1,
    },
    logo: {
      width: 34,
      height: 34,
    },
    wordmark: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "center",
      flexShrink: 1,
      marginLeft: 2,
    },
    brandLine: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      marginBottom: -1,
    },
    riskLine: {
      alignSelf: "flex-start",
      marginTop: 0,
    },
    brandText: {
      color: COLORS.primary,
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.9,
      textTransform: "uppercase",
      includeFontPadding: false,
    },
    riskText: {
      color: COLORS.primary,
      fontSize: 12.5,
      fontWeight: "800",
      letterSpacing: 0.9,
      textTransform: "uppercase",
      includeFontPadding: false,
    },
    monogram: {
      width: 16,
      height: 16,
      marginHorizontal: 2,
    },
    bell: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    dot: {
      position: "absolute",
      top: 2,
      right: 4,
      width: 7,
      height: 7,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      borderWidth: 1.5,
      borderColor: COLORS.background,
    },
  });
}
