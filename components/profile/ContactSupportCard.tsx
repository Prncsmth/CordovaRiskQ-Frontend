import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function ContactSupportCard() {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <Ionicons name="chatbubbles-outline" size={20} color={COLORS.gray} />
      </View>
      <Text style={styles.message}>
        If you have any other query you can reach out to us.
      </Text>
      <Animated.View style={animatedStyle}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/contact-support");
          }}
          onPressIn={() => {
            scale.value = withTiming(0.97, { duration: 100 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 100 });
          }}
          hitSlop={8}
        >
          <Text style={styles.ctaText}>Contact Support</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
        </Pressable>
      </Animated.View>
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
    padding: SPACING.md,
    alignItems: "center",
    gap: SPACING.xs,
    ...SHADOW,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  message: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.tide,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    marginTop: 2,
  },
  ctaText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "800",
    color: COLORS.white,
  },
  });
}
