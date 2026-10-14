import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { EmptyState } from "@/components/common/EmptyState";
import ReportHistoryCard from "@/components/report-history/ReportHistoryCard";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useTabBarHeight } from "@/context/TabBarHeightContext";
import {
  deleteReport,
  getReportHistory,
  type ReportHistoryItem,
} from "@/services/report.service";
import { FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
import { latestIncidentStatusAt } from "@/utils/notifications";

export default function ReportHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const tabBarHeight = useTabBarHeight();
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Numbers every history request so only the newest one's answer is kept --
  // live status updates can fire two reloads seconds apart (accepted, then
  // en route), and an older response landing last would otherwise put the
  // stale status back on screen.
  const latestRequestRef = useRef(0);

  const loadReports = useCallback(() => {
    if (!token) return;

    const request = ++latestRequestRef.current;
    setLoadFailed(false);
    getReportHistory(token)
      .then((history) => {
        if (request === latestRequestRef.current) setReports(history);
      })
      .catch(() => {
        if (request === latestRequestRef.current) setLoadFailed(true);
      })
      .finally(() => setLoaded(true));
  }, [token]);

  const handleRefresh = useCallback(() => {
    if (!token) return;
    const request = ++latestRequestRef.current;
    setRefreshing(true);
    setLoadFailed(false);
    getReportHistory(token)
      .then((history) => {
        if (request === latestRequestRef.current) setReports(history);
      })
      .catch(() => {
        if (request === latestRequestRef.current) setLoadFailed(true);
      })
      .finally(() => setRefreshing(false));
  }, [token]);

  // Only removes the card once the backend confirms the delete -- this
  // route doesn't exist yet (see deleteReport's comment in
  // report.service.ts), so every attempt currently fails and the report
  // correctly stays put rather than silently disappearing and reappearing
  // on the next refresh.
  const handleDelete = useCallback(
    (id: string) => {
      if (!token) return;
      setDeletingIds((prev) => new Set(prev).add(id));
      deleteReport(token, id)
        .then(() => {
          setReports((prev) => prev.filter((r) => r.id !== id));
        })
        .catch(() => {
          Alert.alert("Couldn't delete report", "Please try again in a moment.");
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

  // The tab stays mounted for the app's lifetime (no unmountOnBlur), so a
  // plain mount-once effect would never pick up a status change made
  // elsewhere (e.g. cancelling an SOS alert) until the app restarts --
  // refetch every time this tab regains focus instead, the same pattern
  // already used for other data that can change off-screen (see home.tsx).
  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports]),
  );

  // Live status: the backend sends this citizen an "incident_status"
  // notification over the app's one shared notification socket
  // (NotificationContext) whenever a report's status changes -- e.g. a
  // responder accepts it. Reload once each time a newer one shows up, so the
  // card doesn't sit on "Pending" until the tab is reopened. The baseline is
  // taken after the notification list's initial load, so opening the app
  // doesn't trigger an extra reload; a reconnect refetch that brings in a
  // missed newer update does.
  const { notifications, isLoading: notificationsLoading } = useNotifications();
  const latestStatusAt = latestIncidentStatusAt(notifications);
  const seenStatusAt = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (notificationsLoading) return;
    const seen = seenStatusAt.current;
    if (seen === undefined) {
      seenStatusAt.current = latestStatusAt;
      return;
    }
    if (latestStatusAt === null || (seen !== null && latestStatusAt <= seen)) return;
    seenStatusAt.current = latestStatusAt;
    loadReports();
  }, [latestStatusAt, notificationsLoading, loadReports]);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: tabBarHeight + SPACING.md },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.section}>
        <Text style={styles.title}>Report History</Text>
        <Text style={styles.subtitle}>{"Track the status of what you've reported"}</Text>
      </View>

      {/* Same pill shape as the Home screen's SOS button (and Submit
          Report), in the usual red gradient. */}
      <PrimaryButton
        title="New Report"
        pill
        leadingIcon="add"
        onPress={() => router.push("/(tabs)/report")}
      />

      {loaded && loadFailed ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={28} color={COLORS.textTertiary} />
          <Text style={styles.errorText}>Couldn&apos;t load your reports. Check your connection.</Text>
          <Pressable onPress={loadReports} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : loaded && reports.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          message="No reports yet."
          subtitle="Your submitted reports will appear here."
        />
      ) : (
        <View style={styles.list}>
          {reports.length > 0 ? (
            <Text style={styles.sectionHeading}>
              {reports.length} {reports.length === 1 ? "Report" : "Reports"}
            </Text>
          ) : null}
          {reports.map((item) => (
            <ReportHistoryCard
              key={item.id}
              item={item}
              onDelete={() => handleDelete(item.id)}
              deleting={deletingIds.has(item.id)}
            />
          ))}
        </View>
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
    gap: SPACING.md,
  },
  section: {
    gap: SPACING.xs,
  },
  title: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  list: {
    // Room between cards so a long history doesn't read as one solid block.
    gap: SPACING.md,
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
  });
}
