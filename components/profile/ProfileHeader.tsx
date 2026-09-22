import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/common/Avatar";
import { useProfilePhoto } from "@/context/ProfilePhotoContext";
import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

type ProfileHeaderProps = {
  name: string;
  onPress: () => void;
};

export default function ProfileHeader({ name, onPress }: ProfileHeaderProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { photoUri } = useProfilePhoto();
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Open user profile"
    >
      <Avatar name={name} photoUri={photoUri} />
      <View style={styles.textCol}>
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textFaint} />
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: SPACING.md,
    ...SHADOW,
  },
  pressed: {
    opacity: 0.85,
  },
  textCol: {
    flex: 1,
  },
  welcome: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  name: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 2,
  },
  });
}
