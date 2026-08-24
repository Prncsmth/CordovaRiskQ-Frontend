import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { RADIUS, useThemeColors, type ColorPalette } from "@/theme";

export function Marker() {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return <View style={styles.marker} />;
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    marker: {
      width: 12,
      height: 12,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tide,
      borderWidth: 2,
      borderColor: COLORS.white,
    },
  });
}
