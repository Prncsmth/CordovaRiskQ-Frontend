// components/notifications/NotificationRow.tsx
// Tappable card used by the Notifications screen's Today/Earlier sections;
// owns the per-type icon and the tap-through route for each notification.
// Styled to match components/report-history/ReportHistoryCard.tsx: one
// bordered/shadowed card per item instead of a shared card with dividers.
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

import { getNotificationReadDisplay } from "@/components/notifications/notificationReadDisplay";
import type { AppNotification, NotificationType } from "@/services/notification.service";
import { FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
import { formatRelativeTime } from "@/utils/formatter";

const ICON_BY_TYPE: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  announcement: "megaphone-outline",
  incident_status: "document-text-outline",
  tide_risk: "water-outline",
  new_incident: "alert-circle-outline",
  roster_update: "people-outline",
  team_ring: "alarm-outline",
};

const FALLBACK_ROUTE_BY_TYPE: Record<
  NotificationType,
  "/(tabs)/report-history" | "/(tabs)/home" | "/responder"
> = {
  incident_status: "/(tabs)/report-history",
  announcement: "/(tabs)/home",
  tide_risk: "/(tabs)/home",
  new_incident: "/responder",
  roster_update: "/responder",
  team_ring: "/responder",
};

const RESPONDER_NOTIFICATION_TYPES: NotificationType[] = [
  "new_incident",
  "roster_update",
  "team_ring",
];

function getNotificationRoute(item: AppNotification) {
  if (item.type === "incident_status" && item.referenceId) {
    return `/report-detail/${item.referenceId}` as const;
  }
  if (RESPONDER_NOTIFICATION_TYPES.includes(item.type) && item.referenceId) {
    return `/responder/${item.referenceId}` as const;
  }
  return FALLBACK_ROUTE_BY_TYPE[item.type] ?? "/(tabs)/home";
}

export default function NotificationRow({ item }: { item: AppNotification }) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const { color, bg, border } = getNotificationReadDisplay(item.read, COLORS);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.card,
          { borderColor: border, borderWidth: item.read ? 1 : 1.5 },
        ]}
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
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: bg, borderColor: border, borderWidth: item.read ? 0 : 1.5 },
          ]}
        >
          <Ionicons
            name={ICON_BY_TYPE[item.type] ?? "notifications-outline"}
            size={18}
            color={color}
          />
        </View>

        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.meta}>{formatRelativeTime(item.createdAt)}</Text>
        </View>

        {!item.read && (
          <View style={[styles.pill, { backgroundColor: COLORS.primaryTint }]}>
            <Text style={[styles.pillText, { color: COLORS.primary }]}>New</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
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
      padding: SPACING.md,
      ...SHADOW,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
    },
    body: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      lineHeight: 18,
    },
    meta: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      marginTop: 2,
    },
    pill: {
      borderRadius: RADIUS.full,
      paddingVertical: 4,
      paddingHorizontal: SPACING.sm,
      alignSelf: "flex-start",
    },
    pillText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
  });
}
