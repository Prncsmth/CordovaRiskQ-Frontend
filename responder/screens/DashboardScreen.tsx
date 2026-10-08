// app/responder/index.tsx
// Entry point for the responder (team) flow: a dashboard showing duty
// status and incoming/active incidents for the responder to pick from.
// Tapping one opens the phased detail flow in [id].tsx (accept/decline ->
// lobby -> on the way -> arrived).
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import QueuedAlertBadge from "@/responder/components/shared/QueuedAlertBadge";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useProfilePhoto } from "@/context/ProfilePhotoContext";
import { useTabBarHeight } from "@/context/TabBarHeightContext";
import { useTour } from "@/context/TourContext";
import BarangayChipSelector from "@/responder/components/dashboard/BarangayChipSelector";
import BarangaySectionHeader from "@/responder/components/dashboard/BarangaySectionHeader";
import DutyToggle from "@/responder/components/dashboard/DutyToggle";
import {
  filterIncidents,
  incidentBarangay,
  type IncidentFilters,
} from "@/responder/components/dashboard/filterIncidents";
import {
  groupIncidentsByBarangay,
  UNKNOWN_LOCATION_ID,
  type BarangayGroup,
} from "@/responder/components/dashboard/groupIncidentsByBarangay";
import IncidentCard from "@/responder/components/dashboard/IncidentCard";
import IncidentFilterBar from "@/responder/components/dashboard/IncidentFilterBar";
import SeeAllToggle from "@/responder/components/dashboard/SeeAllToggle";
import { selectNearestIncidents } from "@/responder/components/dashboard/selectNearestIncidents";
import RButton from "@/responder/components/shared/RButton";
import { getIncidents } from "@/responder/services/incident.service";
import AdvisoryBanner from "@/components/home/AdvisoryBanner";
import {
  getActiveResponderAnnouncement,
  type Announcement,
} from "@/services/advisory.service";
import type { Incident } from "@/responder/types/responder";
import type { Coordinates } from "@/services/location.service";
import { getCurrentLocation } from "@/services/location.service";
import { updateDutyStatus } from "@/services/user.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useIsDarkTheme,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import { formatRelativeTime, formatShortDateTime } from "@/utils/formatter";

const POLL_INTERVAL_MS = 12000;
// How long a just-arrived incident keeps its "NEW" freshness dot after this
// dashboard first notices it.
const NEW_BADGE_DURATION_MS = 60000;
const NEAREST_INCIDENTS_COUNT = 3;
// Collapsed preview length per barangay section -- long lists (many
// incidents in one barangay) turned this list into a wall of scrolling;
// "See All" expands a given section in place instead of always rendering
// every incident up front.
const BARANGAY_PREVIEW_COUNT = 2;

type DutyStatus = "online" | "offline";

export default function ResponderIncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { user, token, updateUser } = useAuth();
  const { photoUri } = useProfilePhoto();
  const {
    notifyHomeReady,
    isCompletedMapLoaded,
    registerTarget,
    unregisterTarget,
    notifyTargetLayout,
  } = useTour();
  const notificationsBellRef = useRef<View>(null);

  // Registered here (not in ResponderTabBar) because this bell -- not the
  // tab bar's own Notifications icon -- is what the responder tour points
  // its "Notifications" step at, matching how the citizen tour also
  // targets HomeHeader's bell rather than a tab icon. Only one component
  // may register "responder-notifications" at a time (they're both
  // mounted together, inside the same tab), so ResponderTabBar
  // deliberately does not register its own Notifications tab under this id.
  useEffect(() => {
    registerTarget("responder-notifications", notificationsBellRef);
    return () =>
      unregisterTarget("responder-notifications", notificationsBellRef);
  }, [registerTarget, unregisterTarget]);
  const [duty, setDuty] = useState<DutyStatus>(() =>
    user?.isOnDuty === false ? "offline" : "online",
  );
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set());
  const [firstSeenSnapshot, setFirstSeenSnapshot] = useState<
    Record<string, number>
  >({});
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
  // Same live, socket-backed source as the citizen Home bell (HomeHeader)
  // -- not a per-screen poll -- so the dot updates the instant a
  // notification arrives or is read, identically for both roles.
  const { hasUnread, latestAnnouncementEvent } = useNotifications();
  // Same Announcement Card as the citizen Home, fed by the responder endpoint
  // (All Users + Responders Only). Kept on screen while offline too --
  // announcements aren't tied to duty status.
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const loadAnnouncement = useCallback(() => {
    if (!token) return;
    getActiveResponderAnnouncement(token)
      .then(setAnnouncement)
      // Best-effort, like the citizen Home: keep the current card on failure.
      .catch(() => {});
  }, [token]);

  useFocusEffect(loadAnnouncement);

  // Re-query the instant an admin publishes one (live socket event via
  // NotificationContext), same as the citizen Home.
  useEffect(() => {
    if (latestAnnouncementEvent) loadAnnouncement();
  }, [latestAnnouncementEvent, loadAnnouncement]);
  // Which barangay sections/the Nearest to You header are currently showing
  // every incident instead of just the collapsed preview -- toggled per
  // section by its own "See All" button, independent of the others.
  const [expandedBarangayIds, setExpandedBarangayIds] = useState<Set<string>>(
    new Set(),
  );
  const [nearestExpanded, setNearestExpanded] = useState(false);
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // Shows the responder First-Time Guide exactly once per account, the
  // first time it ever reaches this Dashboard. Unlike home.tsx's citizen
  // equivalent, this can't fire at mount unconditionally -- a responder
  // account has no "freshly registered" signal to lean on (see
  // notifyHomeReady's role branch in TourContext), so a RETURNING
  // responder who already completed the guide in an earlier session needs
  // the real persisted completedMap value, not the empty map it starts as
  // before that finishes loading. Waiting on isCompletedMapLoaded avoids
  // incorrectly re-showing it on every login.
  useEffect(() => {
    if (!isCompletedMapLoaded) return;
    notifyHomeReady();
    // Fires once per isCompletedMapLoaded false->true transition (i.e. once
    // per account session), not on every notifyHomeReady identity change --
    // same mid-tour-reset concern home.tsx's own citizen effect avoids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompletedMapLoaded]);

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
        initialIncidentIdsRef.current = new Set(
          data.map((incident) => incident.id),
        );
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
    loadAnnouncement();
    try {
      const responderLocation = await getCurrentLocation().catch(
        () => undefined,
      );
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
  // SOS-sourced incidents carry the "sos" category; everything else is a
  // citizen report.
  const sosCount = incidents.filter((i) => i.categoryId === "sos").length;
  const reportCount = incidents.length - sosCount;
  const firstName = user?.name?.split(" ")[0] ?? "Responder";

  const availableTypes = useMemo(
    () =>
      Array.from(new Set(incidents.map((incident) => incident.type))).sort(),
    [incidents],
  );

  // Counts come from the incidents this screen already has loaded (the same
  // authorized getIncidents() result the rest of the screen reads) -- never
  // a separate per-barangay request, and never affected by the barangay
  // filter itself, so a chip's count stays stable as you switch between
  // barangays.
  const availableBarangays = useMemo(() => {
    const byId = new Map<string, { name: string; count: number }>();
    for (const incident of incidents) {
      const barangay = incidentBarangay(incident);
      const existing = byId.get(barangay.id);
      if (existing) existing.count += 1;
      else byId.set(barangay.id, { name: barangay.name, count: 1 });
    }
    return Array.from(byId, ([id, { name, count }]) => ({ id, name, count })).sort(
      (a, b) => {
        if (a.id === UNKNOWN_LOCATION_ID) return 1;
        if (b.id === UNKNOWN_LOCATION_ID) return -1;
        return a.name.localeCompare(b.name);
      },
    );
  }, [incidents]);

  // At most one id -- BarangayChipSelector is single-select, the only thing
  // that ever writes into filters.barangayIds.
  const selectedBarangayId =
    filters.barangayIds.size === 1 ? [...filters.barangayIds][0] : null;

  const handleSelectBarangay = (id: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters((prev) => ({
      ...prev,
      barangayIds: id ? new Set([id]) : new Set(),
    }));
  };

  const filteredIncidents = useMemo(
    () => filterIncidents(incidents, filters),
    [incidents, filters],
  );

  const nearestAll = useMemo(
    () => selectNearestIncidents(filteredIncidents),
    [filteredIncidents],
  );
  const nearestIncidents = nearestExpanded
    ? nearestAll
    : nearestAll.slice(0, NEAREST_INCIDENTS_COUNT);

  // Nothing selected -> no barangay section renders at all, only "Nearest to
  // You" above. Stacking every barangay's section by default was the
  // overwhelming wall of scrolling BarangayChipSelector was built to replace;
  // picking one is now the only way a section appears, instead of a section
  // per barangay always being there to scroll past.
  const sections = useMemo(() => {
    if (!selectedBarangayId) return [];
    return groupIncidentsByBarangay(filteredIncidents, firstSeenSnapshot).map(
      (group) => ({
        title: group,
        data: expandedBarangayIds.has(group.id)
          ? group.incidents
          : group.incidents.slice(0, BARANGAY_PREVIEW_COUNT),
      }),
    );
  }, [filteredIncidents, firstSeenSnapshot, expandedBarangayIds, selectedBarangayId]);

  // Haptics fire from SeeAllToggle itself (its own onPress wrapper), not here.
  const handleToggleBarangayExpanded = (id: string) => {
    setExpandedBarangayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleHighUrgency = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilters((prev) => {
      const urgencies = new Set(prev.urgencies);
      if (urgencies.has("high")) urgencies.delete("high");
      else urgencies.add("high");
      return { ...prev, urgencies };
    });
  };

  const handleToggleDuty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const previous = duty;
    const next: DutyStatus = previous === "online" ? "offline" : "online";
    setDuty(next);

    if (!token) return;
    updateDutyStatus(token, next === "online")
      // Keep the app's saved user in step with the server, so the logout
      // notice and this pill (after the screen remounts) show the real
      // duty status instead of the one from login.
      .then(() => {
        if (user) void updateUser({ ...user, isOnDuty: next === "online" });
      })
      .catch(() => {
        setDuty(previous);
        Alert.alert(
          "Something went wrong",
          "Couldn't update your duty status. Please try again.",
        );
      });
  };

  // The announcement scrolls with the incident list (it used to sit in the
  // fixed header, squeezing the list); when no list is on screen -- off
  // duty, loading, or an empty state -- it shows above that state instead.
  const announcementBanner = announcement ? (
    <AdvisoryBanner
      id={announcement.id}
      priority={announcement.priority}
      time={formatShortDateTime(announcement.createdAt)}
      title={announcement.title}
      message={announcement.content}
    />
  ) : null;
  const showsList =
    duty === "online" &&
    hasLoadedOnce &&
    incidents.length > 0 &&
    filteredIncidents.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <LinearGradient
          colors={COLORS.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroGradient, { paddingTop: insets.top + SPACING.xs }]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/user-profile");
                }}
                hitSlop={8}
              >
                <Avatar
                  name={user?.name ?? "Responder"}
                  photoUri={photoUri}
                  size={40}
                />
              </Pressable>
              <View>
                <Text style={styles.headerGreeting}>Hi, {firstName}</Text>
                <Text style={styles.headerTitle}>Responder</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                ref={notificationsBellRef}
                onLayout={() => notifyTargetLayout()}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/notifications");
                }}
                hitSlop={12}
                style={styles.bellButton}
                accessibilityRole="button"
                accessibilityLabel={
                  hasUnread ? "Notifications, unread" : "Notifications"
                }
              >
                <Ionicons
                  name="notifications"
                  size={26}
                  color={COLORS.primary}
                />
                {hasUnread ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            </View>
          </View>

          <QueuedAlertBadge
            style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.sm }}
          />

          <View style={styles.statusRow}>
            <DutyToggle onDuty={duty === "online"} onToggle={handleToggleDuty} />

            {duty === "online" && lastUpdatedAt ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Updated {formatRelativeTime(lastUpdatedAt).toLowerCase()}
              </Text>
            ) : null}
          </View>

          {/* How many of the nearby incidents are SOS alerts vs citizen
              reports, at a glance -- next to the High Urgency filter. */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <View style={[styles.statIcon, { backgroundColor: `${COLORS.danger}26` }]}>
                  <Ionicons name="warning" size={14} color={COLORS.danger} />
                </View>
                <Text style={[styles.statValue, { color: COLORS.danger }]}>{sosCount}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>
                SOS Alerts
              </Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <View style={[styles.statIcon, { backgroundColor: `${COLORS.tide}26` }]}>
                  <Ionicons name="document-text" size={14} color={COLORS.tide} />
                </View>
                <Text style={styles.statValue}>{reportCount}</Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>
                Reports
              </Text>
            </View>
            <Pressable
              style={[
                styles.statCard,
                filters.urgencies.has("high") && styles.statCardActive,
              ]}
              onPress={handleToggleHighUrgency}
              accessibilityRole="button"
              accessibilityLabel={
                filters.urgencies.has("high")
                  ? "High urgency, showing high urgency incidents only, tap to clear"
                  : "High urgency, tap to show high urgency incidents only"
              }
            >
              <View style={styles.statTopRow}>
                <View style={[styles.statIcon, { backgroundColor: `${COLORS.primary}26` }]}>
                  <Ionicons name="alert-circle" size={14} color={COLORS.primary} />
                </View>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {highUrgencyCount}
                </Text>
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>
                High Urgency
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      {duty === "offline" && announcementBanner ? (
        <View style={styles.announcementOutsideList}>{announcementBanner}</View>
      ) : null}

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
            You&apos;re off duty — go on duty to receive incidents.
          </Text>
          <RButton
            label="Go On Duty"
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
          />

          {availableBarangays.length > 0 && (
            <BarangayChipSelector
              barangays={availableBarangays}
              totalCount={incidents.length}
              selectedBarangayId={selectedBarangayId}
              onSelect={handleSelectBarangay}
            />
          )}

          {!showsList && announcementBanner ? (
            <View style={styles.announcementOutsideList}>{announcementBanner}</View>
          ) : null}

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
              contentContainerStyle={[
                styles.list,
                { paddingBottom: tabBarHeight + SPACING.md },
              ]}
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              // An element, not an inline function: a new function each render
              // is a new component type, so the header (and the announcement
              // inside it) would remount every render -- and the banner's tour
              // onLayout re-renders this screen, which looped forever.
              ListHeaderComponent={
                nearestIncidents.length > 0 || announcementBanner
                  ? (
                      <>
                        {announcementBanner ? (
                          <View style={styles.announcementInList}>{announcementBanner}</View>
                        ) : null}
                        {nearestIncidents.length > 0 ? (
                          <View style={styles.nearestSection}>
                            <Text style={styles.nearestLabel}>Nearest to You</Text>
                            {nearestIncidents.map((incident) => (
                              <IncidentCard
                                key={incident.id}
                                incident={incident}
                                isNew={newIncidentIds.has(incident.id)}
                                onPress={() =>
                                  router.push({
                                    pathname: "/responder/[id]",
                                    params: { id: incident.id },
                                  })
                                }
                              />
                            ))}
                            {nearestAll.length > NEAREST_INCIDENTS_COUNT && (
                              <SeeAllToggle
                                expanded={nearestExpanded}
                                remainingCount={nearestAll.length - NEAREST_INCIDENTS_COUNT}
                                onPress={() => setNearestExpanded((prev) => !prev)}
                              />
                            )}
                          </View>
                        ) : null}
                      </>
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
                  onPress={() =>
                    router.push({
                      pathname: "/responder/[id]",
                      params: { id: item.id },
                    })
                  }
                />
              )}
              renderSectionFooter={({ section }) => {
                const total = section.title.incidents.length;
                if (total <= BARANGAY_PREVIEW_COUNT) return null;
                const isExpanded = expandedBarangayIds.has(section.title.id);
                return (
                  <SeeAllToggle
                    expanded={isExpanded}
                    remainingCount={total - section.data.length}
                    onPress={() => handleToggleBarangayExpanded(section.title.id)}
                  />
                );
              }}
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
      paddingBottom: SPACING.sm,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
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
      // Without this, the count+timestamp string had no width constraint next
      // to the duty pill, so it could overflow past the row on a long
      // "Updated X minutes ago" value instead of wrapping/truncating.
      flex: 1,
      flexShrink: 1,
      textAlign: "right",
      marginLeft: SPACING.sm,
    },
    // Plain icon, no circular background/border -- just a big enough tap
    // target (44x44, Apple/Android's own minimum) centered around it.
    bellButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    // Same offset from the 26px icon as HomeHeader's dot (its 36px box
    // vs this 44px one, hence different raw numbers).
    unreadDot: {
      position: "absolute",
      top: 6,
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
      marginBottom: SPACING.sm,
    },
    statsRow: {
      flexDirection: "row",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
    },
    // The list already pads its sides; outside it the banner needs its own.
    announcementInList: {
      marginBottom: SPACING.md,
    },
    announcementOutsideList: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
    },
    // Three across: icon + number on top, label underneath, so even
    // "High Urgency" fits on a narrow phone.
    statCard: {
      flex: 1,
      gap: 2,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm,
    },
    statCardActive: {
      backgroundColor: COLORS.primaryTint,
    },
    statIcon: {
      width: 26,
      height: 26,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },
    statTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs,
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
      // Room between incident cards, like the citizen Report History list.
      gap: SPACING.md,
    },
    nearestSection: {
      gap: SPACING.md,
    },
    nearestLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      letterSpacing: 0.2,
      textTransform: "uppercase",
    },
  });
}
