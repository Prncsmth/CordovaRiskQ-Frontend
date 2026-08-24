// app/responder/[id].tsx
// Screens 1-4 of the responder flow: New Incident -> Team Lobby -> On the
// Way -> Arrived. Driven by a single `phase` state so the incident's real
// status field (from the backend) can replace this local state 1:1 later.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
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

import BackButton from "@/components/common/BackButton";
import RippleRings from "@/components/common/RippleRings";
import IncidentMap from "@/components/responder/IncidentMap";
import { getIncidentVisual } from "@/components/responder/incidentVisual";
import RButton from "@/components/responder/RButton";
import TeamMemberRow from "@/components/responder/TeamMemberRow";
import UrgencyBadge from "@/components/responder/UrgencyBadge";
import { getIncidentById } from "@/services/mockIncidents";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident, IncidentStatus } from "@/types/responder";

type Phase = Exclude<IncidentStatus, "completed" | "cancelled">;
type LobbyTab = "lobby" | "details";

// Hand-picked darker shade of an arbitrary incident color, used as the
// second gradient stop on icon badges -- incident colors are dynamic
// (per report category), not theme tokens, so there's no "Dark" variant
// to reference the way COLORS.primaryDark works.
function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Gradient-filled circular icon badge with a glossy top sheen -- the same
// treatment as SOSButton, reused here for the incident-type badges shown
// across every phase of the flow.
function GradientIconCircle({
  color,
  size,
  iconSize,
  icon,
  style,
  COLORS,
}: {
  color: string;
  size: number;
  iconSize: number;
  icon: keyof typeof Ionicons.glyphMap;
  style?: object;
  COLORS: ColorPalette;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: color,
          shadowOpacity: 0.3,
          shadowRadius: size * 0.18,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[color, darken(color, 40)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[COLORS.sheenOverlay, "rgba(255,255,255,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "55%",
          }}
        />
        <Ionicons name={icon} size={iconSize} color={COLORS.white} />
      </LinearGradient>
    </View>
  );
}

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const incident = useMemo(() => getIncidentById(id), [id]);
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [phase, setPhase] = useState<Phase>("pending");
  const [tab, setTab] = useState<LobbyTab>("lobby");

  if (!incident) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>Incident not found.</Text>
      </View>
    );
  }

  const handleDecline = () => {
    Alert.alert("Decline incident?", "This incident will be reassigned.", [
      { text: "Cancel", style: "cancel" },
      { text: "Decline", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const handleCancelIncident = () => {
    Alert.alert("Cancel incident?", "This cannot be undone.", [
      { text: "Back", style: "cancel" },
      {
        text: "Cancel Incident",
        style: "destructive",
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACING.sm }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {phase !== "on_the_way" && (
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>
            {phase === "pending" ? "New Incident" : `Incident #${incident.id}`}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      {phase === "pending" && (
        <PendingView
          incident={incident}
          onAccept={() => setPhase("lobby")}
          onDecline={handleDecline}
        />
      )}

      {phase === "lobby" && (
        <LobbyView
          incident={incident}
          tab={tab}
          onChangeTab={setTab}
          onHeadOut={() => setPhase("on_the_way")}
        />
      )}

      {phase === "on_the_way" && (
        <OnTheWayView
          incident={incident}
          onArrive={() => setPhase("arrived")}
        />
      )}

      {phase === "arrived" && (
        <ArrivedView
          onStartAssistance={() =>
            Alert.alert("Start Assistance", "Coming soon.")
          }
          onCancelIncident={handleCancelIncident}
        />
      )}
    </View>
  );
}

/* ---------- Phase 1: Pending (accept / decline) ---------- */
function PendingView({
  incident,
  onAccept,
  onDecline,
}: {
  incident: Incident;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);

  return (
    <View style={styles.centeredBody}>
      <View style={styles.pulseWrap}>
        <RippleRings
          size={120}
          ringCount={2}
          animated
          color={`${visual.color}33`}
          style={styles.pulseRings}
        />
        <GradientIconCircle
          color={visual.color}
          size={88}
          iconSize={34}
          icon={visual.icon}
          COLORS={COLORS}
        />
      </View>
      <Text style={styles.incidentType}>{incident.type}</Text>
      <Text style={styles.incidentLocation}>{incident.location}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Distance</Text>
          <Text style={styles.metaValue}>{incident.distanceKm} km</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Urgency</Text>
          <UrgencyBadge urgency={incident.urgency} />
        </View>
      </View>

      <View style={styles.pendingActions}>
        <RButton label="Accept" onPress={onAccept} variant="primary" />
        <RButton label="Decline" onPress={onDecline} variant="secondary" />
      </View>
    </View>
  );
}

/* ---------- Phase 2: Team Lobby ---------- */
function LobbyView({
  incident,
  tab,
  onChangeTab,
  onHeadOut,
}: {
  incident: Incident;
  tab: LobbyTab;
  onChangeTab: (t: LobbyTab) => void;
  onHeadOut: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);
  const [rung, setRung] = useState(false);
  const captain = incident.team.find((m) => m.isCaptain);

  const handleRingTeam = () => {
    if (rung) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRung(true);
    setTimeout(() => setRung(false), 2500);
  };

  return (
    <View style={styles.body}>
      <View style={styles.summaryCard}>
        <GradientIconCircle
          color={visual.color}
          size={40}
          iconSize={18}
          icon={visual.icon}
          COLORS={COLORS}
        />
        <View>
          <Text style={styles.summaryTitle}>{incident.type}</Text>
          <Text style={styles.summarySubtitle}>{incident.location}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, tab === "lobby" && styles.tabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChangeTab("lobby");
          }}
        >
          <Text
            style={[styles.tabLabel, tab === "lobby" && styles.tabLabelActive]}
          >
            Team Lobby
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tabButton,
            tab === "details" && styles.tabButtonActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChangeTab("details");
          }}
        >
          <Text
            style={[
              styles.tabLabel,
              tab === "details" && styles.tabLabelActive,
            ]}
          >
            Details
          </Text>
        </Pressable>
      </View>

      {tab === "lobby" ? (
        <ScrollView>
          <Text style={styles.sectionLabel}>
            Responders Joined ({incident.team.length}/{incident.maxResponders})
          </Text>
          {incident.team.map((member) => (
            <TeamMemberRow key={member.id} member={member} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView>
          <DetailRow label="Incident ID" value={incident.id} />
          <DetailRow label="Type" value={incident.type} />
          <DetailRow label="Location" value={incident.location} />
          <DetailRow label="Urgency" value={incident.urgency} />
          <DetailRow label="Distance" value={`${incident.distanceKm} km`} />
        </ScrollView>
      )}

      <RButton
        label={rung ? `${captain?.name ?? "Captain"} Alerted` : "Ring Team"}
        variant={rung ? "success" : "secondary"}
        icon={rung ? "checkmark-circle" : "notifications"}
        onPress={handleRingTeam}
      />
      <RButton label="Head Out" variant="primary" onPress={onHeadOut} />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/* ---------- Phase 3: On the Way ---------- */
function OnTheWayView({
  incident,
  onArrive,
}: {
  incident: Incident;
  onArrive: () => void;
}) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const visual = getIncidentVisual(incident.type);

  return (
    <View style={styles.mapScreen}>
      {incident.incidentCoords && incident.responderCoords ? (
        <View style={styles.mapContainer}>
          <IncidentMap
            responderCoords={incident.responderCoords}
            incidentCoords={incident.incidentCoords}
            etaMinutes={incident.etaMinutes ?? 6}
          />
        </View>
      ) : (
        <Text style={styles.notFound}>Location data unavailable.</Text>
      )}

      <View style={styles.mapHeaderCard}>
        <GradientIconCircle
          color={visual.color}
          size={40}
          iconSize={18}
          icon={visual.icon}
          COLORS={COLORS}
        />
        <View>
          <Text style={styles.summaryTitle}>{incident.type}</Text>
          <Text style={styles.summarySubtitle}>
            You&apos;re {incident.distanceKm} km away
          </Text>
        </View>
      </View>

      <View style={styles.actionDock}>
        <RButton
          label="Navigate"
          icon="navigate"
          variant="primary"
          onPress={() =>
            router.push({
              pathname: "/responder/navigate",
              params: { id: incident.id },
            })
          }
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

/* ---------- Phase 4: Arrived ---------- */
function ArrivedView({
  onStartAssistance,
  onCancelIncident,
}: {
  onStartAssistance: () => void;
  onCancelIncident: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.body}>
      <View style={styles.centeredBody}>
        <Text style={styles.arrivedText}>
          You have arrived at the incident location.
        </Text>
        <GradientIconCircle
          color={COLORS.success}
          size={88}
          iconSize={40}
          icon="checkmark"
          style={{ marginBottom: SPACING.lg }}
          COLORS={COLORS}
        />
      </View>

      <Text style={styles.sectionLabel}>Actions</Text>
      <ActionRow
        icon="people-outline"
        label="Start Assistance"
        onPress={onStartAssistance}
      />
      <ActionRow
        icon="close-circle-outline"
        label="Cancel Incident"
        onPress={onCancelIncident}
        danger
      />
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const tint = danger ? COLORS.danger : COLORS.tide;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.actionRow}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <View
          style={[styles.actionIcon, { backgroundColor: `${tint}1A` }]}
        >
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text style={[styles.actionLabel, danger && { color: COLORS.danger }]}>
          {label}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={COLORS.textTertiary}
        />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
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
  headerTitle: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
  },
  notFound: {
    textAlign: "center",
    marginTop: SPACING.xl,
    color: COLORS.textTertiary,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  mapScreen: {
    flex: 1,
    position: "relative",
    backgroundColor: COLORS.surface,
  },
  mapHeaderCard: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOW_LG,
  },
  mapContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  actionDock: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    bottom: SPACING.sm,
    zIndex: 2,
  },
  centeredBody: {
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  pulseWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  pulseRings: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  incidentType: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
    color: COLORS.text,
    textAlign: "center",
  },
  incidentLocation: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  metaRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  metaBox: {
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    minWidth: 108,
  },
  metaLabel: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    fontWeight: "600",
  },
  metaValue: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: "700",
  },
  pendingActions: {
    width: "100%",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    color: COLORS.text,
  },
  summarySubtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.white,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontWeight: "700",
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  detailLabel: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.caption,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "600",
  },
  etaActionRow: {
    flexDirection: "row",
    marginTop: SPACING.md,
  },
  arrivedText: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOW,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text,
  },
  });
}
