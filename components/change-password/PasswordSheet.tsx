import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors, RADIUS, SHADOW_LG, SPACING, type ColorPalette } from "@/theme";

const DISMISS_THRESHOLD = 100;
const DISMISS_DISTANCE = 600;

type PasswordSheetProps = {
  children: React.ReactNode;
  onClose: () => void;
};

export default function PasswordSheet({
  children,
  onClose,
}: PasswordSheetProps) {
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        translateY.value = withTiming(DISMISS_DISTANCE, { duration: 200 }, (finished) => {
          if (finished) {
            runOnJS(onClose)();
          }
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.overlay}>
      <BlurView
        intensity={30}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + SPACING.md },
            animatedStyle,
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.iconBadgeWrap}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconBadge}
            >
              <LinearGradient
                colors={[COLORS.sheenOverlay, "rgba(255,255,255,0)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.8 }}
                style={styles.sheen}
              />
              <Ionicons name="lock-closed" size={24} color={COLORS.white} />
            </LinearGradient>
          </View>

          {children}
        </Animated.View>
      </GestureDetector>
    </View>
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
      gap: SPACING.md,
      ...SHADOW_LG,
    },
    handle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
      marginBottom: SPACING.xs,
    },
    iconBadgeWrap: {
      alignItems: "center",
      marginBottom: -SPACING.xs,
    },
    iconBadge: {
      width: 60,
      height: 60,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      shadowColor: COLORS.primary,
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    sheen: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "55%",
    },
  });
}
