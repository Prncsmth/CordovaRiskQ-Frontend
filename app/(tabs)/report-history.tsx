import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { EmptyState } from "@/components/common/EmptyState";
import ReportHistoryCard from "@/components/report-history/ReportHistoryCard";
import { getReportHistory, type ReportHistoryItem } from "@/services/report.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

export default function ReportHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getReportHistory()
      .then((history) => setReports(history))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

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
          message="No reports yet."
          subtitle="Your submitted reports will appear here."
        />
      ) : (
        <View style={styles.list}>
          {reports.map((item) => (
            <ReportHistoryCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  list: {
    gap: SPACING.sm,
  },
});
