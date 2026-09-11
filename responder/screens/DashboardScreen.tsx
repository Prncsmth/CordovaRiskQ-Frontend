// app/responder/index.tsx
// Entry point for the responder (team) flow: a dashboard showing duty
// status and incoming/active incidents for the responder to pick from.
// Tapping one opens the phased detail flow in [id].tsx (accept/decline ->
// lobby -> on the way -> arrived).
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/common/Avatar";
import RippleRings from "@/components/common/RippleRings";
import BarangaySectionHeader from "@/responder/components/dashboard/BarangaySectionHeader";
import {
  incidentBarangay,
  filterIncidents,
  type IncidentFilters,
} from "@/responder/components/dashboard/filterIncidents";
import { groupIncidentsByBarangay, UNKNOWN_LOCATION_ID, type BarangayGroup } from "@/responder/components/dashboard/groupIncidentsByBarangay";
import IncidentCard from "@/responder/components/dashboard/IncidentCard";
import IncidentFilterBar from "@/responder/components/dashboard/IncidentFilterBar";
import RButton from "@/responder/components/shared/RButton";
import { selectNearestIncidents } from "@/responder/components/dashboard/selectNearestIncidents";
import { useAuth } from "@/context/AuthContext";
import { useProfilePhoto } from "@/context/ProfilePhotoContext";
import { getIncidents } from "@/responder/services/incident.service";
import type { Coordinates } from "@/services/location.service";
import { getCurrentLocation } from "@/services/location.service";
import { getNotifications } from "@/services/notification.service";
import { updateDutyStatus } from "@/services/user.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useIsDarkTheme,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident } from "@/responder/types/responder";
import { formatRelativeTime } from "@/utils/formatter";

const POLL_INTERVAL_MS = 12000;
// How long a just-arrived incident keeps its "NEW" badge after this
// dashboard first notices it.
const NEW_BADGE_DURATION_MS = 60000;
const NEAREST_INCIDENTS_COUNT = 3;

type DutyStatus = "online" | "offline";

export default function ResponderIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, user, token } = useAuth();
  const { photoUri } = useProfilePhoto();
  const [duty, setDuty] = useState<DutyStatus>(() =>
    user?.isOnDuty === false ? "offline" : "online",
  );
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set());
  const [firstSeenSnapshot, setFirstSeenSnapshot] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<IncidentFilters>({
    search: "",
    urgencies: new Set(),
    types: new Set(),
    barangayIds: new Set(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  // "Nearby" stat icon is tide-tinted rather than the primary/danger tint
  // that COLORS.iconTileGradient represents, so it needs its own
  // theme-aware two-stop gradient instead of a hardcoded light-only hex.
  const tideIconGradient: [string, string] = isDark
    ? [COLORS.tideTint, "#1F5C58"]
    : [COLORS.tideTint, "#CFEDEB"];

  // Real first-observed timestamp per incident id -- always set to the
  // actual time this device first saw the incident. Used for the "time
  // ago" caption and the barangay group recency tiebreak. Never
  // special-cased to 0, so the time caption never reads "Just now" for an
  // incident that was already pending before this dashboard opened.
  // Mirrored into `firstSeenSnapshot` state on every load since render
  // must not read a ref's `current` value directly.
  const firstSeenRef = useRef<Record<string, number>>({});
  // Incident ids present at the very first successful load. Excluded
  // from the "NEW" badge forever, so opening the dashboard doesn't flood
  // it with NEW badges for incidents that were already pending. `null`
  // until the first load completes.
  const initialIncidentIdsRef = useRef<Set<string> | null>(null);

  const loadIncidents = useCallback(
    async (responderLocation?: Coordinates) => {
      if (!token) return;
      const data = await getIncidents(token, responderLocation);
      const now = Date.now();

      for (const incident of data) {
        if (!(incident.id in firstSeenRef.current)) {
          firstSeenRef.current[incident.id] = now;
        }
      }
      if (initialIncidentIdsRef.current === null) {
        initialIncidentIdsRef.current = new Set(data.map((incident) => incident.id));
      }

      const newIds = new Set(
        data
          .filter((incident) => {
            if (initialIncidentIdsRef.current!.has(incident.id)) return false;
            const firstSeenAt = firstSeenRef.current[incident.id];
            return now - firstSeenAt < NEW_BADGE_DURATION_MS;
          })
          .map((incident) => incident.id),
      );

      setNewIncidentIds(newIds);
      setIncidents(data);
      setFirstSeenSnapshot({ ...firstSeenRef.current });
      setLastUpdatedAt(new Date());
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      const activeToken = token;

      let cancelled = false;
      let responderLocation: Coordinates | undefined;

      async function poll() {
        try {
          if (!cancelled) {
            await loadIncidents(responderLocation);
            if (!cancelled) setLoadError(false);
          }
        } catch {
          // A failed poll shouldn't clear the currently-shown list; the
          // next interval tick retries.
          if (!cancelled) setLoadError(true);
        } finally {
          if (!cancelled) setHasLoadedOnce(true);
        }

        getNotifications(activeToken)
          .then((notifications) => {
            if (!cancelled) setHasUnread(notifications.some((n) => !n.read));
          })
          .catch(() => {});
      }

      getCurrentLocation().then((fix) => {
        responderLocation = fix;
        poll();
      });

      const interval = setInterval(poll, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [token, loadIncidents]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const responderLocation = await getCurrentLocation().catch(() => undefined);
      await loadIncidents(responderLocation);
      setLoadError(false);
    } catch {
      // Keep the current list on a failed manual refresh too.
      setLoadError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const highUrgencyCount = incidents.filter((i) => i.urgency === "high").length;
  const firstName = user?.name?.split(" ")[0] ?? "Responder";

  const availableTypes = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.type))).sort(),
    [incidents],
  );

  const availableBarangays = useMemo(() => {
    const byId = new Map<string, string>();
    for (const incident of incidents) {
      const barangay = incidentBarangay(incident);
      byId.set(barangay.id, barangay.name);
    }
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => {
      if (a.id === UNKNOWN_LOCATION_ID) return 1;
      if (b.id === UNKNOWN_LOCATION_ID) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [incidents]);

  const filteredIncidents = useMemo(
    () => filterIncidents(incidents, filters),
    [incidents, filters],
  );

  const nearestIncidents = useMemo(
    () => selectNearestIncidents(filteredIncidents, NEAREST_INCIDENTS_COUNT),
    [filteredIncidents],
  );

  const sections = useMemo(
    () =>
      groupIncidentsByBarangay(filteredIncidents, firstSeenSnapshot).map((group) => ({
        title: group,
        data: group.incidents,
      })),
    [filteredIncidents, firstSeenSnapshot],
  );

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Log out?", "You'll stop receiving incident alerts.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const handleToggleDuty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const previous = duty;
    const next: DutyStatus = previous === "online" ? "offline" : "online";
    setDuty(next);

    if (!token) return;
    updateDutyStatus(token, next === "online").catch(() => {
      setDuty(previous);
      Alert.alert(
        "Something went wrong",
        "Couldn't update your duty status. Please try again.",
      );
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <LinearGradient
          colors={COLORS.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroGradient, { paddingTop: insets.top + SPACING.sm }]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Avatar name={user?.name ?? "Responder"} photoUri={photoUri} />
              <View>
                <Text style={styles.headerGreeting}>Hi, {firstName}</Text>
                <Text style={styles.headerTitle}>Dashboard</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/notifications");
                }}
                hitSlop={12}
                style={styles.logoutButton}
                accessibilityRole="button"
                accessibilityLabel={
                  hasUnread ? "Notifications, unread" : "Notifications"
                }
              >
                <Ionicons name="notifications-outline" size={18} color={COLORS.text} />
                {hasUnread ? <View style={styles.unreadDot} /> : null}
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/settings");
                }}
                hitSlop={12}
                style={styles.logoutButton}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={18} color={COLORS.text} />
              </Pressable>

              <Pressable
                onPress={handleLogout}
                hitSlop={12}
                style={styles.logoutButton}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Ionicons name="power" size={18} color={COLORS.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Pressable
              style={[
                styles.dutyPill,
                duty === "offline" && styles.dutyPillOffline,
              ]}
              onPress={handleToggleDuty}
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
              {incidents.length} nearby incident
              {incidents.length === 1 ? "" : "s"}
              {duty === "online" && lastUpdatedAt
                ? ` · Updated ${formatRelativeTime(lastUpdatedAt).toLowerCase()}`
                : ""}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: COLORS.tide }]}>
              <LinearGradient
                colors={tideIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statIcon}
              >
                <Ionicons name="navigate" size={16} color={COLORS.tide} />
              </LinearGradient>
              <Text style={styles.statValue}>{incidents.length}</Text>
              <Text style={styles.statLabel}>Nearby</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
              <LinearGradient
                colors={COLORS.iconTileGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statIcon}
              >
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={COLORS.primary}
                />
              </LinearGradient>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>
                {highUrgencyCount}
              </Text>
              <Text style={styles.statLabel}>High Urgency</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {duty === "offline" ? (
        <View style={styles.offlineState}>
          <RippleRings
            size={140}
            ringCount={3}
            color={
              isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(107, 114, 128, 0.08)"
            }
            style={styles.offlineWatermark}
          />
          <Ionicons name="moon-outline" size={32} color={COLORS.textTertiary} />
          <Text style={styles.offlineText}>
            You&apos;re offline — go online to receive incidents.
          </Text>
          <RButton
            label="Go Online"
            icon="radio-button-on-outline"
            variant="primary"
            onPress={handleToggleDuty}
            style={styles.goOnlineButton}
          />
        </View>
      ) : (
        <>
          <IncidentFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            availableTypes={availableTypes}
            availableBarangays={availableBarangays}
          />

          {!hasLoadedOnce ? (
            <View style={styles.noResultsState}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : loadError && incidents.length === 0 ? (
            <View style={styles.noResultsState}>
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={COLORS.textTertiary}
              />
              <Text style={styles.noResultsText}>
                Couldn&apos;t load incidents. Check your connection.
              </Text>
              <RButton
                label="Retry"
                icon="refresh"
                variant="secondary"
                onPress={handleRefresh}
                style={styles.retryButton}
              />
            </View>
          ) : incidents.length === 0 ? (
            <View style={styles.noResultsState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={28}
                color={COLORS.textTertiary}
              />
              <Text style={styles.noResultsText}>
                You&apos;re all caught up — no nearby incidents right now.
              </Text>
            </View>
          ) : filteredIncidents.length === 0 ? (
            <View style={styles.noResultsState}>
              <Ionicons
                name="search-outline"
                size={28}
                color={COLORS.textTertiary}
              />
              <Text style={styles.noResultsText}>
                No incidents match your search or filters.
              </Text>
            </View>
          ) : (
            <SectionList<Incident, { title: BarangayGroup }>
              sections={sections}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              ListHeaderComponent={
                nearestIncidents.length > 0
                  ? () => (
                      <View style={styles.nearestSection}>
                        <Text style={styles.nearestLabel}>Nearest to You</Text>
                        {nearestIncidents.map((incident) => (
                          <IncidentCard
                            key={incident.id}
                            incident={incident}
                            isNew={newIncidentIds.has(incident.id)}
                            firstSeenAt={firstSeenSnapshot[incident.id] ?? 0}
                            onPress={() =>
                              router.push({
                                pathname: "/responder/[id]",
                                params: { id: incident.id },
                              })
                            }
                          />
                        ))}
                      </View>
                    )
                  : undefined
              }
              renderSectionHeader={({ section }) => (
                <BarangaySectionHeader group={section.title} />
              )}
              renderItem={({ item }) => (
                <IncidentCard
                  incident={item}
                  isNew={newIncidentIds.has(item.id)}
                  firstSeenAt={firstSeenSnapshot[item.id] ?? 0}
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
        </>
      )}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  hero: {
    ...SHADOW_LG,
  },
  heroGradient: {
    borderBottomLeftRadius: RADIUS.xl + 6,
    borderBottomRightRadius: RADIUS.xl + 6,
    paddingBottom: SPACING.md,
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
  headerActions: {
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
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.background,
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
    backgroundColor: COLORS.background,
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
    borderLeftWidth: 4,
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
    paddingTop: SPACING.sm,
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
  goOnlineButton: {
    width: "100%",
    marginTop: SPACING.sm,
  },
  noResultsState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  noResultsText: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textTertiary,
    textAlign: "center",
    fontWeight: "600",
  },
  retryButton: {
    width: 160,
    marginTop: SPACING.sm,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  nearestSection: {
    gap: SPACING.md,
  },
  nearestLabel: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  });
}
