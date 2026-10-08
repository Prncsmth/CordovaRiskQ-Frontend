// components/responder/DutyToggle.tsx
// On/Off Duty switch for the responder Dashboard header: a status label
// next to a sliding switch, in the same white-card-on-hero language as the
// stat cards below it. Green when on duty, neutral grey when off.
import React, { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { RADIUS, SHADOW, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 22;
const KNOB_SIZE = 18;
const KNOB_INSET = (TRACK_HEIGHT - KNOB_SIZE) / 2;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB_SIZE - KNOB_INSET * 2;

export default function DutyToggle({
  onDuty,
  onToggle,
}: {
  onDuty: boolean;
  onToggle: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [knobX] = useState(() => new Animated.Value(onDuty ? KNOB_TRAVEL : 0));

  useEffect(() => {
    Animated.spring(knobX, {
      toValue: onDuty ? KNOB_TRAVEL : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [onDuty, knobX]);

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={6}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: onDuty }}
      accessibilityLabel="Duty status"
      accessibilityHint={onDuty ? "Tap to go off duty" : "Tap to go on duty"}
    >
      <View style={styles.labelCol}>
        <Text style={styles.caption}>Status</Text>
        <Text style={[styles.label, { color: onDuty ? COLORS.success : COLORS.textSecondary }]}>
          {onDuty ? "On Duty" : "Off Duty"}
        </Text>
      </View>

      <View
        style={[
          styles.track,
          { backgroundColor: onDuty ? COLORS.success : COLORS.border },
        ]}
      >
        <Animated.View style={[styles.knob, { transform: [{ translateX: knobX }] }]} />
      </View>
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingLeft: 14,
      paddingRight: 6,
      paddingVertical: 5,
      // Never shrink -- only the subtitle text next to it should give up width.
      flexShrink: 0,
      ...SHADOW,
    },
    pressed: {
      opacity: 0.85,
    },
    labelCol: {
      justifyContent: "center",
    },
    caption: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: COLORS.textTertiary,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
    track: {
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      borderRadius: RADIUS.full,
      padding: KNOB_INSET,
      justifyContent: "center",
    },
    knob: {
      width: KNOB_SIZE,
      height: KNOB_SIZE,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.white,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
  });
}
