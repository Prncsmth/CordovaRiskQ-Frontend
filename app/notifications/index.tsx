import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/EmptyState";
import NotificationRow from "@/components/notifications/NotificationRow";
import { useAuth } from "@/context/AuthContext";
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "@/services/notification.service";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

type NotificationsScreenProps = {
  // Set by the responder tab wrapper (app/responder/(tabs)/notifications.tsx)
  // -- this screen is the root of a persistent tab there, so router.back()
  // wouldn't have anywhere sensible to go. The citizen route (a screen
  // pushed from the bell icon) keeps the default, unchanged behavior.
  hideBackButton?: boolean;
};

export default function NotificationsScreen({
  hideBackButton = false,
}: NotificationsScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadFailed(false);

    getNotifications(token)
      .then((result) => {
        setNotifications(result);
        markAllNotificationsRead(token).catch(() => {});
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = useCallback(() => {
    if (!token) return;
    setRefreshing(true);
    setLoadFailed(false);
    getNotifications(token)
      .then((result) => {
        setNotifications(result);
        markAllNotificationsRead(token).catch(() => {});
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setRefreshing(false));
  }, [token]);

  // Only removes the row once the backend confirms the delete -- this route
  // doesn't exist yet (see deleteNotification's comment in
  // notification.service.ts), so every attempt currently fails and the
  // notification correctly stays put rather than silently disappearing and
  // reappearing on the next refresh.
  const handleDelete = useCallback(
    (id: string) => {
      if (!token) return;
      setDeletingIds((prev) => new Set(prev).add(id));
      deleteNotification(token, id)
        .then(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        })
        .catch(() => {
          Alert.alert(
            "Couldn't delete notification",
            "Please try again in a moment.",
          );
        })
        .finally(() => {
          setDeletingIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
    },
    [token],
  );

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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.header}>
        {hideBackButton ? (
          <View style={{ width: 36 }} />
        ) : (
          <BackButton onPress={() => router.back()} />
        )}
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading && token ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      ) : loadFailed ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textTertiary} />
          <Text style={styles.errorText}>Couldn&apos;t load notifications. Check your connection.</Text>
          <Pressable onPress={loadNotifications} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
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
              <View style={styles.list}>
                {today.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onDelete={() => handleDelete(item.id)}
                    deleting={deletingIds.has(item.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {earlier.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Earlier</Text>
              <View style={styles.list}>
                {earlier.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onDelete={() => handleDelete(item.id)}
                    deleting={deletingIds.has(item.id)}
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
  errorState: {
    marginTop: SPACING.xl,
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.caption,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
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
  list: {
    gap: SPACING.sm,
  },
  });
}
