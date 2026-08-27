import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  FONT_FAMILY,
  RADIUS,
  SPACING,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

type HomeHeaderProps = {
  hasUnread: boolean;
};

export default function HomeHeader({ hasUnread }: HomeHeaderProps) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.row}>
      <View style={styles.brand} accessible accessibilityLabel="Cordova RiskQ">
        <Image
          source={require("@/assets/images/riskq.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.wordmark}>
          <View style={styles.brandLine}>
            <Text style={styles.brandText}>C</Text>
            <Image
              source={require("@/assets/images/cordova-logo.png")}
              style={styles.monogram}
              resizeMode="contain"
            />
            <Text style={styles.brandText}>RDOVA</Text>
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
        <Ionicons name="notifications" size={26} color={COLORS.primary} />
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
      width: 42,
      height: 42,
    },
    wordmark: {
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "center",
      flexShrink: 1,
      marginLeft: 4,
    },
    brandLine: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      marginBottom: -2,
    },
    riskLine: {
      alignSelf: "flex-start",
      marginTop: 0,
    },
    brandText: {
      color: COLORS.primary,
      fontFamily: FONT_FAMILY.wordmark,
      fontSize: 20,
      letterSpacing: -1,
      textTransform: "uppercase",
      includeFontPadding: false,
    },
    riskText: {
      color: COLORS.secondary,
      fontFamily: FONT_FAMILY.wordmark,
      fontSize: 20,
      letterSpacing: -1,
      textTransform: "uppercase",
      includeFontPadding: false,
    },
    monogram: {
      width: 20,
      height: 20,
      marginHorizontal: -1,
    },
    bell: {
      width: 36,
      height: 36,
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
