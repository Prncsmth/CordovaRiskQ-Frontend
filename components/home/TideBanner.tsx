import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import PartlyCloudyIcon from "@/components/home/PartlyCloudyIcon";
import TideCardBackground from "@/components/home/TideCardBackground";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

export type TideLevel = "normal" | "watch" | "warning";

type TideBannerProps = {
  level: TideLevel | null;
  detail: string;
  temperatureC: number;
  weatherDescription: string;
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

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setCardSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card} onLayout={handleLayout}>
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
              <PartlyCloudyIcon size={28} />
              <Text style={styles.temp}>{temperatureC}°</Text>
            </View>
            <Text style={styles.weatherDesc}>{weatherDescription}</Text>
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
      </View>
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
      backgroundColor: COLORS.tideCardBg,
      borderRadius: RADIUS.xl,
      padding: SPACING.md,
      overflow: "hidden",
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
      fontSize: TYPOGRAPHY.subtitle,
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
      marginVertical: SPACING.sm,
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
