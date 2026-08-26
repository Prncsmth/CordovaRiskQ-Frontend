import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { EmptyState } from "@/components/common/EmptyState";
import ReportHistoryCard from "@/components/report-history/ReportHistoryCard";
import { useAuth } from "@/context/AuthContext";
import { getReportHistory, type ReportHistoryItem } from "@/services/report.service";
import { FONT_FAMILY, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function ReportHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;

    getReportHistory(token)
      .then((history) => setReports(history))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [token]);

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

      {loaded && reports.length === 0 ? (
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
  });
}
