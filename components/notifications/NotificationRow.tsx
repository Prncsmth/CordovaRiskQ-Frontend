// components/notifications/NotificationRow.tsx
// Tappable row used by the Notifications screen's Today/Earlier sections;
// owns the per-type icon and the tap-through route for each notification.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { AppNotification, NotificationType } from "@/services/notification.service";
import { SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
import { formatRelativeTime } from "@/utils/formatter";

const ICON_BY_TYPE: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  announcement: "megaphone-outline",
  incident_status: "document-text-outline",
  tide_risk: "water-outline",
};

const FALLBACK_ROUTE_BY_TYPE: Record<NotificationType, "/(tabs)/report-history" | "/(tabs)/home"> = {
  incident_status: "/(tabs)/report-history",
  announcement: "/(tabs)/home",
  tide_risk: "/(tabs)/home",
};

function getNotificationRoute(item: AppNotification) {
  if (item.type === "incident_status" && item.referenceId) {
    return `/report-detail/${item.referenceId}` as const;
  }
  return FALLBACK_ROUTE_BY_TYPE[item.type] ?? "/(tabs)/home";
}

export default function NotificationRow({
  item,
  isLast,
}: {
  item: AppNotification;
  isLast: boolean;
}) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.row, !isLast && styles.rowDivider]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(getNotificationRoute(item));
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
          style={styles.iconCircle}
        >
          <Ionicons
            name={ICON_BY_TYPE[item.type] ?? "notifications-outline"}
            size={17}
            color={COLORS.primary}
          />
        </LinearGradient>
        <View style={styles.textCol}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatRelativeTime(item.createdAt)}</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingVertical: SPACING.sm + 2,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderMuted,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    body: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      lineHeight: 18,
    },
    timestamp: {
      fontSize: 11,
      color: COLORS.textTertiary,
      alignSelf: "flex-start",
      marginTop: 2,
    },
  });
}
