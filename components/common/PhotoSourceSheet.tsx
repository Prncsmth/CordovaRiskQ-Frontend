// components/common/PhotoSourceSheet.tsx
// "Take a photo / Choose from gallery" as a bottom sheet in the app's own
// look (handle, rounded top, gradient icon tiles -- same family as
// change-password/PasswordSheet.tsx), instead of the plain system Alert.
// It only reports the choice; the caller opens the camera or gallery.
// The picker is launched after the sheet has closed: on Android, opening
// the camera/gallery while a Modal is still up can fail or come back to a
// frozen screen.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export type PhotoSource = "camera" | "gallery";

// Long enough for the Modal to finish closing before the native picker opens.
const LAUNCH_AFTER_CLOSE_MS = 280;

type PhotoSourceSheetProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onSelect: (source: PhotoSource) => void;
  onClose: () => void;
};

export default function PhotoSourceSheet({
  visible,
  title = "Add a photo",
  subtitle = "A clear photo helps responders see the situation before they arrive.",
  onSelect,
  onClose,
}: PhotoSourceSheetProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(320);
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    translateY.value = visible
      ? withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) })
      : 320;
  }, [visible, translateY]);

  useEffect(
    () => () => {
      if (launchTimer.current) clearTimeout(launchTimer.current);
    },
    [],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function choose(source: PhotoSource) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    launchTimer.current = setTimeout(() => onSelect(source), LAUNCH_AFTER_CLOSE_MS);
  }

  const options: {
    source: PhotoSource;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    hint: string;
  }[] = [
    { source: "camera", icon: "camera", label: "Take a photo", hint: "Use your camera now" },
    {
      source: "gallery",
      icon: "images",
      label: "Choose from gallery",
      hint: "Pick a photo you already took",
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.md }, sheetStyle]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.options}>
            {options.map((option) => (
              <Pressable
                key={option.source}
                onPress={() => choose(option.source)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityHint={option.hint}
              >
                <LinearGradient
                  colors={COLORS.iconTileGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionIcon}
                >
                  <Ionicons name={option.icon} size={22} color={COLORS.primary} />
                </LinearGradient>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionHint}>{option.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && styles.optionPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: COLORS.scrim,
    },
    sheet: {
      backgroundColor: COLORS.background,
      borderTopLeftRadius: RADIUS.xl + 4,
      borderTopRightRadius: RADIUS.xl + 4,
      paddingTop: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      ...SHADOW_LG,
    },
    handle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
      marginBottom: SPACING.md,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: TYPOGRAPHY.small,
      lineHeight: 18,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: 4,
      marginBottom: SPACING.md,
      paddingHorizontal: SPACING.md,
    },
    options: {
      gap: SPACING.sm,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      backgroundColor: COLORS.background,
    },
    optionPressed: {
      backgroundColor: COLORS.surface,
    },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    optionText: {
      flex: 1,
      gap: 2,
    },
    optionLabel: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.text,
    },
    optionHint: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
    cancel: {
      marginTop: SPACING.md,
      paddingVertical: SPACING.md - 2,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      backgroundColor: COLORS.surface,
    },
    cancelText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
  });
}
