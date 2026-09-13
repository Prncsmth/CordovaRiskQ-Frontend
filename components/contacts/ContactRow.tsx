// components/contacts/ContactRow.tsx
// Tappable-to-call row used by the Contacts screen's hotline list.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

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
          <Image source={image} style={styles.contactIcon} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[`${accentColor}33`, `${accentColor}66`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.contactIcon}
          >
            <Ionicons name={icon} size={20} color={accentColor} />
          </LinearGradient>
        )}
        <View style={styles.contactCopy}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactNumber}>{number}</Text>
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
      width: 44,
      height: 44,
      borderRadius: 16,
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
  });
}
