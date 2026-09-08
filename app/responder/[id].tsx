// app/responder/[id].tsx
// Screens 1-4 of the responder flow: New Incident -> Team Lobby -> On the
// Way -> Arrived. Each responder's own phase is derived from their own
// IncidentResponder roster status (incident.myStatus), never stored
// separately -- there's no local phase state to drift out of sync with the
// server. Each phase's UI lives in components/responder/incident-detail/ --
// this file only owns the derived phase and the backend calls that advance
// it.
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import ArrivedView from "@/components/responder/incident-detail/ArrivedView";
import LobbyView, { type LobbyTab } from "@/components/responder/incident-detail/LobbyView";
import OnTheWayView from "@/components/responder/incident-detail/OnTheWayView";
import PendingView from "@/components/responder/incident-detail/PendingView";
import { phaseForMyStatus } from "@/components/responder/phaseForMyStatus";
import { useAuth } from "@/context/AuthContext";
import {
  declineIncident,
  getIncidentById,
  joinIncident,
  updateIncidentStatus,
  updateMyResponderStatus,
} from "@/services/incident.service";
import { connectToIncidentSocket } from "@/services/incidentSocket.service";
import { mergeIncidentUpdate } from "@/components/responder/mergeIncidentUpdate";
import {
  FONT_FAMILY,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Incident } from "@/types/responder";

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [incident, setIncident] = useState<Incident | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [tab, setTab] = useState<LobbyTab>("lobby");
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!token || !id) return;

    getIncidentById(token, id)
      .then(setIncident)
      .finally(() => setIsLoading(false));
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) return;

    const disconnect = connectToIncidentSocket(
      token,
      id,
      (update) => {
        setIncident((prev) => (prev ? mergeIncidentUpdate(prev, update) : prev));
      },
      () => {
        getIncidentById(token, id).then((fresh) => {
          if (fresh) setIncident((prev) => (prev ? { ...fresh, distanceKm: prev.distanceKm } : fresh));
        });
      },
    );

    return disconnect;
  }, [token, id]);

  const myPhase = incident ? phaseForMyStatus(incident.myStatus) : undefined;

  // Only reachable via a stale link -- declined incidents are already
  // filtered out of the dashboard list, so a responder can't tap into one
  // from there. "left" is modeled on the backend but has no UI path back
  // to this screen today either.
  useEffect(() => {
    if (incident && myPhase === null) {
      Alert.alert(
        "Already declined",
        "You already declined this incident.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  }, [incident, myPhase, router]);

  // Another responder (or this one, via handleCancelIncident/the "Start
  // Assistance" flow once it exists) closed the incident -- surface it live
  // rather than leaving a stale screen open. isClosingRef suppresses this
  // when the close was this responder's own action, since their own REST
  // call's socket broadcast can land on their own client mid-navigation.
  useEffect(() => {
    if (
      incident &&
      !isClosingRef.current &&
      (incident.status === "completed" || incident.status === "cancelled")
    ) {
      isClosingRef.current = true;
      Alert.alert(
        incident.status === "completed" ? "Incident resolved" : "Incident cancelled",
        incident.status === "completed"
          ? "This incident has been marked resolved."
          : "This incident was cancelled.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  }, [incident, router]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      </View>
    );
  }

  if (!incident || myPhase === null || myPhase === undefined) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>
          {incident ? "" : "Incident not found."}
        </Text>
      </View>
    );
  }

  const phase = myPhase;

  const handleJoin = async () => {
    if (!token || isJoining) return;
    setIsJoining(true);
    try {
      const updated = await joinIncident(token, incident.id);
      setIncident({ ...updated, distanceKm: incident.distanceKm });
    } catch (err) {
      Alert.alert(
        "Couldn't join incident",
        err instanceof Error ? err.message : "Please try again.",
      );
      setIsJoining(false);
      router.back();
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline incident?",
      "You won't see this incident again, but other responders still can.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await declineIncident(token, incident.id);
              router.back();
            } catch (err) {
              Alert.alert(
                "Couldn't decline incident",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleHeadOut = async () => {
    if (!token) return;
    try {
      const updated = await updateMyResponderStatus(token, incident.id, "on_the_way");
      setIncident({ ...updated, distanceKm: incident.distanceKm });
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
      const updated = await updateMyResponderStatus(token, incident.id, "arrived");
      setIncident({ ...updated, distanceKm: incident.distanceKm });
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
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
          isClosingRef.current = true;
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
          onAccept={handleJoin}
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
