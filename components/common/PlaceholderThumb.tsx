// components/common/PlaceholderThumb.tsx
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { COLORS, RADIUS } from "@/theme";

interface PlaceholderThumbProps {
  style?: StyleProp<ViewStyle>;
}

export default function PlaceholderThumb({ style }: PlaceholderThumbProps) {
  return <View style={[styles.box, style]} />;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.borderMuted,
    borderRadius: RADIUS.lg,
  },
});
