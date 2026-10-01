// components/common/BrandLockup.tsx
// The Cordova RiskQ text logo: the RiskQ mark, then "C(O)RDOVA" over "RISKQ"
// with the Cordova seal standing in for the O. Same lockup as
// components/home/HomeHeader.tsx's wordmark, for screens outside the tabs
// (app intro, login).
import React, { useMemo } from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { FONT_FAMILY, useThemeColors, type ColorPalette } from "@/theme";

export default function BrandLockup({ style }: { style?: StyleProp<ViewStyle> }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={[styles.brand, style]} accessible accessibilityLabel="Cordova RiskQ">
      <Image
        source={require("@/assets/images/riskq.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View>
        <View style={styles.line}>
          <Text style={styles.text}>C</Text>
          <Image
            source={require("@/assets/images/cordova-logo.png")}
            style={styles.monogram}
            resizeMode="contain"
          />
          <Text style={styles.text}>RDOVA</Text>
        </View>
        <Text style={[styles.text, styles.riskText]}>RISKQ</Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    brand: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      height: 44,
      gap: 6,
    },
    logo: {
      width: 40,
      height: 40,
    },
    line: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: -2,
    },
    text: {
      color: COLORS.primary,
      fontFamily: FONT_FAMILY.wordmark,
      fontSize: 20,
      letterSpacing: -1,
      includeFontPadding: false,
    },
    riskText: {
      color: COLORS.secondary,
    },
    monogram: {
      width: 20,
      height: 20,
      marginHorizontal: -1,
    },
  });
}
