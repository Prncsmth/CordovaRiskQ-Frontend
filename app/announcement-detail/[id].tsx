// app/announcement-detail/[id].tsx
// Reached from a tapped "announcement" notification (push via
// hooks/useNotificationDeepLink.ts, in-app via
// components/notifications/NotificationRow.tsx) -- both resolve the same
// referenceId into this one screen. Structure mirrors
// app/report-detail/[id].tsx: loading/error/not-found states, BackButton
// header, ScrollView + RefreshControl, InfoRow cards.
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import InfoRow from "@/components/report-detail/InfoRow";
import { getAnnouncementById, type Announcement } from "@/services/advisory.service";
import { formatDate, formatTime } from "@/utils/formatter";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default function AnnouncementDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadFailed(false);
    getAnnouncementById(id)
      .then((result) => setAnnouncement(result ?? null))
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Separate from load/isLoading so pull-to-refresh updates in place
  // instead of replacing the screen with the full-screen loading state.
  const handleRefresh = useCallback(() => {
    if (!id) return;
    setRefreshing(true);
    getAnnouncementById(id)
      .then((result) => setAnnouncement(result ?? null))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.centerFlex, { paddingTop: insets.top }]}>
        <BackButton onPress={() => router.back()} style={styles.notFoundBack} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (loadFailed) {
    return (
      <View style={[styles.centerFlex, { paddingTop: insets.top }]}>
        <BackButton onPress={() => router.back()} style={styles.notFoundBack} />
        <Ionicons name="alert-circle-outline" size={32} color={COLORS.textTertiary} />
        <Text style={styles.notFoundTitle}>Couldn&apos;t load this announcement</Text>
        <Text style={styles.notFoundText}>Check your connection and try again.</Text>
        <Pressable onPress={load} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!announcement) {
    return (
      <View style={[styles.centerFlex, { paddingTop: insets.top }]}>
        <BackButton onPress={() => router.back()} style={styles.notFoundBack} />
        <Ionicons name="alert-circle-outline" size={32} color={COLORS.textTertiary} />
        <Text style={styles.notFoundTitle}>Announcement not found</Text>
        <Text style={styles.notFoundText}>
          This announcement may have been removed.
        </Text>
      </View>
    );
  }

  const isUrgent = announcement.priority === "Urgent";

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}
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
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Announcement</Text>
        <View style={{ width: 36 }} />
      </View>

      {announcement.imageUrl ? (
        <Image source={{ uri: announcement.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}

      <View style={styles.metaRow}>
        <Text style={[styles.meta, isUrgent && { color: COLORS.warning }]}>
          ANNOUNCEMENT · {isUrgent ? "URGENT" : "NOTICE"}
        </Text>
      </View>

      <Text style={styles.title}>{announcement.title}</Text>
      <Text style={styles.body}>{announcement.content}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.infoCard}>
          {announcement.author ? (
            <InfoRow label="Posted by" value={announcement.author} />
          ) : null}
          <InfoRow label="Date" value={formatDate(announcement.createdAt)} />
          <InfoRow label="Time" value={formatTime(announcement.createdAt)} last />
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    centerFlex: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.background,
      gap: SPACING.xs,
      paddingHorizontal: SPACING.lg,
    },
    notFoundBack: {
      position: "absolute",
      left: SPACING.md,
      top: 0,
    },
    notFoundTitle: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.text,
      marginTop: SPACING.xs,
    },
    notFoundText: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      textAlign: "center",
    },
    retryButton: {
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
    },
    retryButtonText: {
      color: COLORS.white,
      fontWeight: "700",
    },
    content: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.xl,
      gap: SPACING.xs,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACING.sm,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
    },
    image: {
      width: "100%",
      height: 180,
      borderRadius: RADIUS.lg,
      marginBottom: SPACING.sm,
      backgroundColor: COLORS.surface,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    meta: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      color: COLORS.textTertiary,
      letterSpacing: 0.4,
    },
    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.heading,
      color: COLORS.text,
      marginTop: SPACING.xs,
    },
    body: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      lineHeight: 22,
      marginTop: SPACING.xs,
      marginBottom: SPACING.md,
    },
    section: {
      marginTop: SPACING.sm,
    },
    sectionLabel: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginBottom: SPACING.xs,
    },
    infoCard: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.md,
      ...SHADOW,
    },
  });
}
