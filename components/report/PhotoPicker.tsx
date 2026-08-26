import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

type PhotoPickerProps = {
  attached: boolean;
  onToggle: () => void;
};

export default function PhotoPicker({ attached, onToggle }: PhotoPickerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (attached) {
    return (
      <View style={styles.attachedWrap}>
        <PlaceholderThumb style={styles.thumb} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.emptyBox}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <LinearGradient
          colors={COLORS.iconTileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyIcon}
        >
          <Ionicons name="camera" size={22} color={COLORS.primary} />
        </LinearGradient>
        <Text style={styles.emptyLabel}>Add Photo</Text>
        <Text style={styles.emptyHint}>Tap to attach evidence</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  emptyBox: {
    height: 130,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyHint: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  attachedWrap: {
    height: 130,
    width: 130,
  },
  thumb: {
    width: 130,
    height: 130,
    borderRadius: RADIUS.lg,
    ...SHADOW,
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  });
}
