import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";
import CompletedIncidentCard from "@/responder/components/completed/CompletedIncidentCard";
import { getCompletedIncidents } from "@/responder/services/incident.service";
import type { CompletedIncident } from "@/responder/services/incident.service";
import {
  FONT_FAMILY,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

export default function CompletedIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [incidents, setIncidents] = useState<CompletedIncident[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;

    getCompletedIncidents(token)
      .then(setIncidents)
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
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>Completed Incidents</Text>
      </View>

      {loaded && incidents.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          message="No completed incidents yet."
          subtitle="Incidents you resolve will appear here."
        />
      ) : (
        <View style={styles.list}>
          {incidents.length > 0 ? (
            <Text style={styles.sectionHeading}>
              {incidents.length} {incidents.length === 1 ? "Incident" : "Incidents"}
            </Text>
          ) : null}
          {incidents.map((item) => (
            <CompletedIncidentCard key={item.id} item={item} />
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
      gap: SPACING.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    backButton: {
      position: "absolute",
      left: 0,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
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
