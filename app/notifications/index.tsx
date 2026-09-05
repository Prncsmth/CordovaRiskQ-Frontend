import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";
import {
  getNotifications,
  markAllNotificationsRead,
  type AppNotification,
  type NotificationType,
} from "@/services/notification.service";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";
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

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    getNotifications(token)
      .then((result) => {
        setNotifications(result);
        return markAllNotificationsRead(token);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [token]);

  const today = notifications.filter((n) => isToday(n.createdAt));
  const earlier = notifications.filter((n) => !isToday(n.createdAt));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading && token ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          message="You're all caught up"
          subtitle="New alerts and updates will show up here."
        />
      ) : (
        <>
          {today.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Today</Text>
              <View style={styles.card}>
                {today.map((item, index) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    isLast={index === today.length - 1}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {earlier.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Earlier</Text>
              <View style={styles.card}>
                {earlier.map((item, index) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    isLast={index === earlier.length - 1}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function NotificationRow({
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
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
  },
  loading: {
    marginTop: SPACING.xl,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.md,
    ...SHADOW,
  },
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
