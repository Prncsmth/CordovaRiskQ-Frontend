// components/contacts/ContactRow.tsx
// Tappable-to-call row used by the Contacts screen's hotline list.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function ContactRow({
  icon,
  accentColor,
  image,
  name,
  number,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  image?: ImageSourcePropType;
  name: string;
  number: string;
  onPress: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.contactRow}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`Call ${name}, ${number}`}
      >
        {image ? (
          // The seals are transparent PNGs trimmed to the logo itself, so
          // they're shown whole, in their own shape (the PNP shield isn't
          // round), with nothing behind them in light or dark mode.
          <Image source={image} style={styles.seal} resizeMode="contain" />
        ) : (
          <View style={[styles.contactIcon, { backgroundColor: `${accentColor}1A` }]}>
            <Ionicons name={icon} size={20} color={accentColor} />
          </View>
        )}
        <View style={styles.contactCopy}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactNumber}>{number}</Text>
        </View>
        {/* The whole row calls; this just makes that obvious at a glance. */}
        <View style={styles.callPill}>
          <Text style={styles.callPillText}>Call</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingVertical: SPACING.sm + 4,
    },
    seal: {
      width: 44,
      height: 44,
    },
    // Fallback icon tile, for a hotline without a seal image.
    contactIcon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    contactCopy: { flex: 1, minWidth: 0 },
    contactName: {
      fontFamily: FONT_FAMILY.displaySemibold,
      color: COLORS.text,
      fontSize: TYPOGRAPHY.caption,
    },
    contactNumber: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.small,
      marginTop: 2,
    },
    // A quiet outlined "Call" label -- says exactly what a tap does.
    callPill: {
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.success,
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
    },
    callPillText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.success,
    },
  });
}
