// app/responder/index.tsx
// Entry point for the responder (team) flow: lists incoming/active
// incidents for the responder to pick from. Tapping one opens the phased
// detail flow in [id].tsx (accept/decline -> lobby -> on the way -> arrived).
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { mockIncidents } from "@/services/mockIncidents";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";
import type { Incident } from "@/types/responder";

export default function ResponderIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incidents</Text>
        <Text style={styles.headerSubtitle}>
          {mockIncidents.length} nearby incident{mockIncidents.length === 1 ? "" : "s"}
        </Text>
      </View>

      <FlatList
        data={mockIncidents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <IncidentCard
            incident={item}
            onPress={() =>
              router.push({ pathname: "/responder/[id]", params: { id: item.id } })
            }
          />
        )}
      />
    </View>
  );
}

function IncidentCard({ incident, onPress }: { incident: Incident; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.sosBadge}>
        <Text style={styles.sosText}>SOS</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{incident.type}</Text>
        <Text style={styles.cardLocation}>{incident.location}</Text>
        <View style={styles.cardMetaRow}>
          <UrgencyBadge urgency={incident.urgency} />
          <Text style={styles.cardDistance}>{incident.distanceKm} km away</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  sosBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sosText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 10,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    color: COLORS.text,
  },
  cardLocation: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 2,
  },
  cardDistance: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    fontWeight: "600",
  },
});
