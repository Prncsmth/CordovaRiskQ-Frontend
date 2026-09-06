// app/responder/[id].tsx
// Screens 1-4 of the responder flow: New Incident -> Team Lobby -> On the
// Way -> Arrived. Driven by a single `phase` state so the incident's real
// status field (from the backend) can replace this local state 1:1 later.
// Each phase's UI lives in components/responder/incident-detail/ -- this
// file only owns the phase state machine and the backend calls that
// advance it.
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import ArrivedView from "@/components/responder/incident-detail/ArrivedView";
import LobbyView, { type LobbyTab } from "@/components/responder/incident-detail/LobbyView";
import OnTheWayView from "@/components/responder/incident-detail/OnTheWayView";
import PendingView from "@/components/responder/incident-detail/PendingView";
import { useAuth } from "@/context/AuthContext";
import {
  acceptIncident,
  getIncidentById,
  updateIncidentStatus,
} from "@/services/incident.service";
import {
  FONT_FAMILY,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident, IncidentStatus } from "@/types/responder";

type Phase = Exclude<IncidentStatus, "completed" | "cancelled">;

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("pending");
  const [tab, setTab] = useState<LobbyTab>("lobby");

  useEffect(() => {
    if (!token || !id) return;

    getIncidentById(token, id)
      .then((fetched) => {
        setIncident(fetched);
        if (fetched) setPhase(fetched.status as Phase);
      })
      .finally(() => setIsLoading(false));
  }, [token, id]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      </View>
    );
  }

  if (!incident) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>Incident not found.</Text>
      </View>
    );
  }

  // acceptIncident/updateIncidentStatus re-fetch the incident without a
  // responderLocation (they don't take one — see Task 6), so their response
  // always has distanceKm: undefined. Carrying forward the previously-known
  // distance avoids the "Distance" field visibly flipping to "Unknown" on
  // every status change, which would otherwise regress from what the
  // Dashboard's poll already computed.
  const handleAccept = async () => {
    if (!token) return;
    try {
      const updated = await acceptIncident(token, incident.id);
      setIncident({ ...updated, distanceKm: incident.distanceKm });
      setPhase("lobby");
    } catch (err) {
      Alert.alert(
        "Couldn't accept incident",
        err instanceof Error ? err.message : "Please try again.",
      );
      router.back();
    }
  };

  const handleHeadOut = async () => {
    if (!token) return;
    try {
      const updated = await updateIncidentStatus(token, incident.id, "on_the_way");
      setIncident({ ...updated, distanceKm: incident.distanceKm });
      setPhase("on_the_way");
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  const handleArrive = async () => {
    if (!token) return;
    try {
      const updated = await updateIncidentStatus(token, incident.id, "arrived");
      setIncident({ ...updated, distanceKm: incident.distanceKm });
      setPhase("arrived");
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

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
        onPress: async () => {
          if (token) {
            await updateIncidentStatus(token, incident.id, "cancelled").catch(() => {});
          }
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACING.sm }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {phase !== "on_the_way" && (
        <View style={styles.header}>
          <BackButton onPress={() => router.dismissTo("/responder")} />
          <Text style={styles.headerTitle}>
            {phase === "pending" ? "New Incident" : `Incident #${incident.id}`}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      {phase === "pending" && (
        <PendingView
          incident={incident}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}

      {phase === "lobby" && (
        <LobbyView
          incident={incident}
          tab={tab}
          onChangeTab={setTab}
          onHeadOut={handleHeadOut}
        />
      )}

      {phase === "on_the_way" && (
        <OnTheWayView
          incident={incident}
          onArrive={handleArrive}
        />
      )}

      {phase === "arrived" && (
        <ArrivedView
          incident={incident}
          onStartAssistance={() =>
            Alert.alert("Start Assistance", "Coming soon.")
          }
          onCancelIncident={handleCancelIncident}
        />
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
    loading: {
      marginTop: SPACING.xl,
    },
  });
}
