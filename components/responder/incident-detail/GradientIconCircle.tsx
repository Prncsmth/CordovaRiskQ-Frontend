// components/responder/incident-detail/GradientIconCircle.tsx
// Gradient-filled circular icon badge with a glossy top sheen -- the same
// treatment as SOSButton, reused across every phase of the incident-detail
// flow for incident-type badges.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View } from "react-native";

import type { ColorPalette } from "@/theme";

import { darken } from "./colorUtils";

export default function GradientIconCircle({
  color,
  size,
  iconSize,
  icon,
  style,
  COLORS,
}: {
  color: string;
  size: number;
  iconSize: number;
  icon: keyof typeof Ionicons.glyphMap;
  style?: object;
  COLORS: ColorPalette;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: color,
          shadowOpacity: 0.3,
          shadowRadius: size * 0.18,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[color, darken(color, 40)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[COLORS.sheenOverlay, "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "55%",
          }}
        />
        <Ionicons name={icon} size={iconSize} color={COLORS.white} />
      </LinearGradient>
    </View>
  );
}
