import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap from "@/components/map/AppMap";
import BackButton from "@/components/common/BackButton";
import { getReportStatusDisplay } from "@/components/report/reportStatusDisplay";
import InfoRow from "@/components/report-detail/InfoRow";
import { useAuth } from "@/context/AuthContext";
import { getReportDetailById, type ReportDetail } from "@/services/report.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

const MAP_HEIGHT = 170;

export default function ReportDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) {
      setIsLoading(false);
      return;
    }
    getReportDetailById(token, id)
      .then((result) => setReport(result ?? null))
      .finally(() => setIsLoading(false));
  }, [token, id]);

  if (isLoading) {
    return (
      <View style={[styles.centerFlex, { paddingTop: insets.top }]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.centerFlex, { paddingTop: insets.top }]}>
        <BackButton onPress={() => router.back()} style={styles.notFoundBack} />
        <Ionicons name="alert-circle-outline" size={32} color={COLORS.textTertiary} />
        <Text style={styles.notFoundTitle}>Report not found</Text>
        <Text style={styles.notFoundText}>
          This report may have been removed, or you may not have access to it.
        </Text>
      </View>
    );
  }

  const { label, color, bg } = getReportStatusDisplay(report.status, COLORS);
  const hasCoords = report.latitude != null && report.longitude != null;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Report Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.category}>{report.category}</Text>
        <View style={[styles.statusPill, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} />
        <Text style={styles.address}>{report.location}</Text>
      </View>

      {hasCoords ? (
        <View style={styles.mapBox}>
          <AppMap
            style={styles.map}
            center={{ latitude: report.latitude as number, longitude: report.longitude as number }}
            zoom={15}
            interactive={false}
            showLayerSwitcher={false}
            markers={[
              {
                id: "report-pin",
                latitude: report.latitude as number,
                longitude: report.longitude as number,
                color: COLORS.primary,
              },
            ]}
          />
        </View>
      ) : null}

      {report.details ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Details</Text>
          <Text style={styles.detailsText}>{report.details}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Report Info</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Reference" value={report.ref} />
          <InfoRow label="Submitted" value={report.submittedDate} />
          <InfoRow label="Last Updated" value={report.updatedDate} last />
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
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: SPACING.sm,
    },
    category: {
      flex: 1,
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.heading,
      color: COLORS.text,
    },
    statusPill: {
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      marginTop: 2,
    },
    statusText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
    addressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: SPACING.xs,
      marginBottom: SPACING.md,
    },
    address: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
    },
    mapBox: {
      height: MAP_HEIGHT,
      borderRadius: RADIUS.lg,
      overflow: "hidden",
      backgroundColor: COLORS.surface,
      marginBottom: SPACING.md,
      ...SHADOW,
    },
    map: {
      ...StyleSheet.absoluteFill,
    },
    section: {
      marginTop: SPACING.sm,
      gap: SPACING.sm,
    },
    sectionLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginLeft: 2,
    },
    detailsText: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
      lineHeight: 20,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      ...SHADOW,
    },
    infoCard: {
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingHorizontal: SPACING.md,
      ...SHADOW,
    },
  });
}
