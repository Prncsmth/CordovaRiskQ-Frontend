import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import TideCardBackground from "@/components/home/TideCardBackground";
import WeatherIcon, { getWeatherGradient, getWeatherKind } from "@/components/home/WeatherIcon";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

export type TideLevel = "normal" | "watch" | "warning";

type TideBannerProps = {
  level: TideLevel | null;
  detail: string;
  temperatureC: number | null;
  weatherDescription: string | null;
  floodMessage: string;
  updatedLabel: string;
};

const LEVEL_LABEL: Record<TideLevel, string> = {
  normal: "Normal",
  watch: "Watch",
  warning: "Warning",
};

function getLevelDotColor(COLORS: ColorPalette, level: TideLevel | null): string {
  if (level === "warning") return COLORS.danger;
  if (level === "watch") return COLORS.warning;
  if (level === "normal") return COLORS.tideCardAccent;
  return COLORS.tideCardMuted;
}

function getLevelTextColor(COLORS: ColorPalette, level: TideLevel | null): string {
  if (level === "warning") return COLORS.danger;
  if (level === "watch") return COLORS.warning;
  return COLORS.white;
}

// During a watch/warning, the card's background overrides the weather sky
// gradient with a solid alert tint -- a dark muted color in the same hue as
// the headline text, rather than the bright highlight color, so every other
// white/near-white label on the card stays legible while the whole card
// still reads as "this is currently in a watch/warning state" at a glance.
function getAlertCardBackground(COLORS: ColorPalette, level: TideLevel): string {
  return level === "warning" ? COLORS.tideCardBgWarning : COLORS.tideCardBgWatch;
}

export default function TideBanner({
  level,
  detail,
  temperatureC,
  weatherDescription,
  floodMessage,
  updatedLabel,
}: TideBannerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 18;

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setCardSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }

  const isAlert = level === "watch" || level === "warning";
  const weatherGradient = getWeatherGradient(getWeatherKind(weatherDescription ?? ""), isNight);
  const cardColors = isAlert
    ? ([getAlertCardBackground(COLORS, level), getAlertCardBackground(COLORS, level)] as const)
    : weatherGradient;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={cardColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
        onLayout={handleLayout}
      >
        <TideCardBackground width={cardSize.width} height={cardSize.height} />

        <View style={styles.topRow}>
          <View style={styles.left}>
            <Text style={styles.label}>TIDE LEVEL</Text>
            <Text style={[styles.level, { color: getLevelTextColor(COLORS, level) }]}>
              {level ? LEVEL_LABEL[level] : "Unavailable"}
            </Text>
            <Text style={styles.detail}>{detail}</Text>
          </View>

          <View style={styles.right}>
            <View style={styles.weatherRow}>
              <WeatherIcon weatherDescription={weatherDescription ?? ""} isNight={isNight} size={38} />
              <Text style={styles.temp}>{temperatureC != null ? `${temperatureC}°` : "—°"}</Text>
            </View>
            <Text style={styles.weatherDesc}>{weatherDescription ?? "Weather unavailable"}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View style={styles.floodRow}>
            <View style={[styles.dot, { backgroundColor: getLevelDotColor(COLORS, level) }]} />
            <Text style={styles.floodMessage}>{floodMessage}</Text>
          </View>
          <Text style={styles.updated}>{updatedLabel}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      borderRadius: RADIUS.xl,
      ...SHADOW,
    },
    card: {
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.35)",
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    left: {
      flexShrink: 1,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.tideCardMuted,
      letterSpacing: 0.6,
    },
    level: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      marginTop: 2,
    },
    detail: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.tideCardMuted,
      marginTop: 2,
    },
    right: {
      alignItems: "flex-end",
    },
    weatherRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    temp: {
      fontSize: TYPOGRAPHY.title,
      fontWeight: "800",
      color: COLORS.white,
    },
    weatherDesc: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.tideCardMuted,
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      marginVertical: SPACING.md,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    floodRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexShrink: 1,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.full,
    },
    floodMessage: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.tideCardMuted,
      flexShrink: 1,
    },
    updated: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.tideCardMuted,
    },
  });
}
