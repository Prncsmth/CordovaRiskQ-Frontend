// app/responder/index.tsx
// Entry point for the responder (team) flow: a dashboard showing duty
// status and incoming/active incidents for the responder to pick from.
// Tapping one opens the phased detail flow in [id].tsx (accept/decline ->
// lobby -> on the way -> arrived).
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { useAuth } from "@/context/AuthContext";
import { mockIncidents } from "@/services/mockIncidents";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";
import type { Incident } from "@/types/responder";

type DutyStatus = "online" | "offline";

export default function ResponderIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [duty, setDuty] = useState<DutyStatus>("online");

  const highUrgencyCount = mockIncidents.filter((i) => i.urgency === "high").length;

  const handleLogout = () => {
    Alert.alert("Log out?", "You'll stop receiving incident alerts.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {mockIncidents.length} nearby incident{mockIncidents.length === 1 ? "" : "s"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[
              styles.dutyPill,
              duty === "offline" && styles.dutyPillOffline,
            ]}
            onPress={() => setDuty((d) => (d === "online" ? "offline" : "online"))}
          >
            <View
              style={[
                styles.dutyDot,
                { backgroundColor: duty === "online" ? COLORS.success : COLORS.gray },
              ]}
            />
            <Text style={styles.dutyText}>{duty === "online" ? "Online" : "Offline"}</Text>
          </Pressable>

          <Pressable onPress={handleLogout} hitSlop={12} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{mockIncidents.length}</Text>
          <Text style={styles.statLabel}>Nearby</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{highUrgencyCount}</Text>
          <Text style={styles.statLabel}>High Urgency</Text>
        </View>
      </View>

      {duty === "offline" ? (
        <View style={styles.offlineState}>
          <Ionicons name="moon-outline" size={32} color={COLORS.textTertiary} />
          <Text style={styles.offlineText}>
            You&apos;re offline — go online to receive incidents.
          </Text>
        </View>
      ) : (
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
      )}
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  dutyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryTint,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dutyPillOffline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  dutyText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.text,
  },
  logoutButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    fontWeight: "600",
    marginTop: 2,
  },
  offlineState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  offlineText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textTertiary,
    textAlign: "center",
    fontWeight: "600",
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
