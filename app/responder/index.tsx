// app/responder/index.tsx
// Entry point for the responder (team) flow: a dashboard showing duty
// status and incoming/active incidents for the responder to pick from.
// Tapping one opens the phased detail flow in [id].tsx (accept/decline ->
// lobby -> on the way -> arrived).
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import RippleRings from "@/components/common/RippleRings";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { useAuth } from "@/context/AuthContext";
import { mockIncidents } from "@/services/mockIncidents";
import {
  COLORS,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
} from "@/theme";
import type { Incident } from "@/types/responder";

type DutyStatus = "online" | "offline";

export default function ResponderIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const [duty, setDuty] = useState<DutyStatus>("online");

  const highUrgencyCount = mockIncidents.filter(
    (i) => i.urgency === "high",
  ).length;
  const firstName = user?.name?.split(" ")[0] ?? "Responder";

  const handleLogout = () => {
    Alert.alert("Log out?", "You'll stop receiving incident alerts.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar name={user?.name ?? "Responder"} />
          <View>
            <Text style={styles.headerGreeting}>Hi, {firstName}</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          hitSlop={12}
          style={styles.logoutButton}
        >
          <Ionicons name="power" size={18} color={COLORS.primary} />
        </Pressable>
      </View>

      <View style={styles.statusRow}>
        <Pressable
          style={[
            styles.dutyPill,
            duty === "offline" && styles.dutyPillOffline,
          ]}
          onPress={() =>
            setDuty((d) => (d === "online" ? "offline" : "online"))
          }
        >
          <View
            style={[
              styles.dutyDot,
              {
                backgroundColor:
                  duty === "online" ? COLORS.success : COLORS.gray,
              },
            ]}
          />
          <Text style={styles.dutyText}>
            {duty === "online" ? "Online" : "Offline"}
          </Text>
        </Pressable>

        <Text style={styles.headerSubtitle}>
          {mockIncidents.length} nearby incident
          {mockIncidents.length === 1 ? "" : "s"}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.tideTint }]}>
            <Ionicons name="navigate" size={16} color={COLORS.tide} />
          </View>
          <Text style={styles.statValue}>{mockIncidents.length}</Text>
          <Text style={styles.statLabel}>Nearby</Text>
        </View>
        <View style={styles.statCard}>
          <View
            style={[styles.statIcon, { backgroundColor: COLORS.primaryTint }]}
          >
            <Ionicons name="alert-circle" size={16} color={COLORS.primary} />
          </View>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {highUrgencyCount}
          </Text>
          <Text style={styles.statLabel}>High Urgency</Text>
        </View>
      </View>

      {duty === "offline" ? (
        <View style={styles.offlineState}>
          <RippleRings
            size={140}
            ringCount={3}
            color="rgba(107, 114, 128, 0.08)"
            style={styles.offlineWatermark}
          />
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
                router.push({
                  pathname: "/responder/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function IncidentCard({
  incident,
  onPress,
}: {
  incident: Incident;
  onPress: () => void;
}) {
  const visual = getIncidentVisual(incident.type);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: `${visual.color}1A` },
          ]}
        >
          <Ionicons name={visual.icon} size={22} color={visual.color} />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{incident.type}</Text>
          <View style={styles.cardLocationRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color={COLORS.textSecondary}
            />
            <Text style={styles.cardLocation}>{incident.location}</Text>
          </View>
          <View style={styles.cardMetaRow}>
            <UrgencyBadge urgency={incident.urgency} />
            <Text style={styles.cardDistance}>
              {incident.distanceKm} km
              {incident.etaMinutes ? ` · ${incident.etaMinutes} min` : ""}
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textTertiary}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  headerGreeting: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW_LG,
    borderWidth: 1.5,
    borderColor: COLORS.primaryTint,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
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
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOW,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
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
  offlineWatermark: {
    position: "absolute",
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
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW_LG,
  },
  categoryBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    color: COLORS.text,
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
