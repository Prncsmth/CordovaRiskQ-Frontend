// components/contacts/ContactRow.tsx
// Tappable-to-call row used by the Contacts screen's hotline and trusted
// contact lists.
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

import { RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function ContactRow({
  icon,
  iconTint,
  image,
  accentColor,
  name,
  number,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint: "primary" | "tide";
  image?: ImageSourcePropType;
  accentColor?: string;
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

  const gradientColors: readonly [string, string] =
    iconTint === "primary"
      ? COLORS.iconTileGradient
      : [COLORS.tideTint, COLORS.tideTint];
  const iconColor = iconTint === "primary" ? COLORS.primary : COLORS.tide;
  // Local hotlines get a green call button (universally reads as "call" /
  // "available") -- personal contacts keep the app's primary red.
  const callButtonColors: readonly [string, string] =
    iconTint === "primary"
      ? [COLORS.success, COLORS.success]
      : [COLORS.primary, COLORS.primaryDark];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.contactRow,
          accentColor && { borderLeftColor: accentColor, borderLeftWidth: 4, paddingLeft: SPACING.sm - 4 },
        ]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        {image ? (
          <Image source={image} style={styles.contactIcon} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.contactIcon,
              { backgroundColor: gradientColors[0] },
            ]}
          >
            <Ionicons name={icon} size={19} color={iconColor} />
          </View>
        )}
        <View style={styles.contactCopy}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactNumber}>{number}</Text>
        </View>
        <View
          style={[styles.callButton, { backgroundColor: callButtonColors[0] }]}
        >
          <Ionicons name="call" size={15} color={COLORS.white} />
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
    contactIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    contactCopy: { flex: 1 },
    contactName: {
      color: COLORS.text,
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
    },
    contactNumber: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.small,
      marginTop: 3,
    },
    callButton: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
