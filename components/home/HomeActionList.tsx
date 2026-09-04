import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type EvacuationCenter } from "@/services/evacuation.service";
import { useTour } from "@/context/TourContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

const WALK_SPEED_KMH = 5;

type HomeActionListProps = {
  nearestCenter: EvacuationCenter | null;
  onPressEvacuation: () => void;
  onPressReport: () => void;
  onPressHotlines: () => void;
};

export default function HomeActionList({
  nearestCenter,
  onPressEvacuation,
  onPressReport,
  onPressHotlines,
}: HomeActionListProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { registerTarget, unregisterTarget } = useTour();
  const anchorRef = useRef<View>(null);

  const walkMinutes = nearestCenter
    ? Math.max(1, Math.round((nearestCenter.distanceKm / WALK_SPEED_KMH) * 60))
    : null;
  const isOpen = nearestCenter?.status === "open";

  useEffect(() => {
    registerTarget("evacuation", anchorRef);
    return () => unregisterTarget("evacuation");
  }, [registerTarget, unregisterTarget]);

  return (
    <View style={styles.card} ref={anchorRef} collapsable={false}>
      {nearestCenter ? (
        <Row
          COLORS={COLORS}
          styles={styles}
          eyebrow="NEAREST EVACUATION CENTER"
          icon="home"
          iconColor={COLORS.success}
          iconBg={COLORS.successBg}
          title={nearestCenter.name}
          subtitle={`${nearestCenter.distanceKm.toFixed(1)} km · ${walkMinutes} min walk`}
          badge={isOpen ? "OPEN" : "FULL"}
          badgeColor={isOpen ? COLORS.success : COLORS.primary}
          badgeBg={isOpen ? COLORS.successBg : COLORS.primaryTint}
          onPress={onPressEvacuation}
        />
      ) : null}

      <Row
        COLORS={COLORS}
        styles={styles}
        icon="warning"
        iconColor={COLORS.primary}
        iconBg={COLORS.primaryTint}
        title="Report an Incident"
        subtitle="Flood, blocked road, power"
        onPress={onPressReport}
      />

      <Row
        COLORS={COLORS}
        styles={styles}
        icon="call"
        iconColor={COLORS.tide}
        iconBg={COLORS.tideTint}
        title="Emergency Hotlines"
        subtitle="MDRRMO, BFP, PNP"
        onPress={onPressHotlines}
        last
      />
    </View>
  );
}

function Row({
  COLORS,
  styles,
  eyebrow,
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  badge,
  badgeColor,
  badgeBg,
  onPress,
  last,
}: {
  COLORS: ColorPalette;
  styles: ReturnType<typeof createStyles>;
  eyebrow?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <View>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Pressable
        style={[styles.row, last ? undefined : styles.rowDivider]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
      </Pressable>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingHorizontal: SPACING.md,
      ...SHADOW,
    },
    eyebrow: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: SPACING.md,
      marginBottom: SPACING.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingVertical: SPACING.md,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.borderMuted,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
    },
    subtitle: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      marginTop: 1,
    },
    badge: {
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
    },
    badgeText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
  });
}
