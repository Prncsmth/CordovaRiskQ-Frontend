import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { EmptyState } from "@/components/common/EmptyState";
import ReportHistoryCard from "@/components/report-history/ReportHistoryCard";
import { useAuth } from "@/context/AuthContext";
import { getReportHistory, type ReportHistoryItem } from "@/services/report.service";
import { FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function ReportHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadReports = useCallback(() => {
    if (!token) return;

    setLoadFailed(false);
    getReportHistory(token)
      .then((history) => setReports(history))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoaded(true));
  }, [token]);

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

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <View style={styles.section}>
        <Text style={styles.title}>Report History</Text>
        <Text style={styles.subtitle}>{"Track the status of what you've reported"}</Text>
      </View>

      <PrimaryButton
        title="+ New Report"
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
            <ReportHistoryCard key={item.id} item={item} />
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
    gap: SPACING.sm,
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
