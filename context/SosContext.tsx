// context/SosContext.tsx
import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { getNearestBarangay } from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import type { ApiError } from "@/services/api";
import { getVerifiedLocation } from "@/services/location.service";
import { cancelSosIncident, triggerSOS } from "@/services/sos.service";
import { isInsideCordova } from "@/utils/geofence";

type SosStage = "idle" | "confirm" | "verifying" | "sending" | "active";
type SosBlockedReason = "permission" | "unavailable" | null;

type SosContextValue = {
  stage: SosStage;
  blockedReason: SosBlockedReason;
  isMinimized: boolean;
  openConfirm: () => void;
  confirmSOS: () => void;
  cancelSOS: () => void;
  expandSOS: () => void;
  minimizeSOS: () => void;
  dismissBlocked: () => void;
  retryConfirm: () => void;
};

const SosContext = createContext<SosContextValue | undefined>(undefined);

// How long the full-screen "Help Is On The Way" overlay stays up before
// auto-minimizing to a persistent banner -- the SOS itself stays active
// server-side either way; this only affects how much of the screen the
// citizen gets back. One-shot: re-expanding via the banner (expandSOS)
// does not restart this timer, so a screen the user deliberately reopened
// never gets yanked away from under them.
const AUTO_MINIMIZE_DELAY_MS = 20_000;

export function SosProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<SosStage>("idle");
  const [blockedReason, setBlockedReason] = useState<SosBlockedReason>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const { token } = useAuth();
  const inFlightRef = useRef(false);
  const minimizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMinimizeTimer = () => {
    if (minimizeTimerRef.current) {
      clearTimeout(minimizeTimerRef.current);
      minimizeTimerRef.current = null;
    }
  };
  // Identifies which runConfirm() call is still "live" -- cancelSOS() bumps
  // this so an abandoned attempt's own async continuation (its getVerifiedLocation
  // or triggerSOS await resolving after the user already cancelled) can tell
  // it's stale and skip touching stage/blockedReason or releasing a guard a
  // newer attempt may since have taken. Without this, cancelling mid-flight
  // and immediately retrying races the original attempt's `finally` clearing
  // inFlightRef out from under the new one, and the original attempt's delayed
  // resolution can pop a blocked-reason modal out of context long after cancel.
  const attemptIdRef = useRef(0);

  const runConfirm = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const myAttemptId = ++attemptIdRef.current;
    const isCurrent = () => attemptIdRef.current === myAttemptId;

    setIncidentId(null);
    setIsMinimized(false);
    clearMinimizeTimer();
    try {
      setStage("verifying");
      const result = await getVerifiedLocation();
      if (!isCurrent()) return;

      if (result.status === "denied") {
        setStage("idle");
        setBlockedReason("permission");
        return;
      }
      if (result.status === "unavailable" || !isInsideCordova(result.coords.latitude, result.coords.longitude)) {
        setStage("idle");
        setBlockedReason("unavailable");
        return;
      }

      if (!token) {
        setStage("idle");
        setBlockedReason("unavailable");
        return;
      }

      setStage("sending");

      const locationLabel = `Barangay ${getNearestBarangay(result.coords.latitude, result.coords.longitude).name}, Cordova`;
      try {
        const alert = await triggerSOS(token, result.coords, locationLabel);
        if (!isCurrent()) return;
        setIncidentId(alert.incidentId);
        setStage("active");
        minimizeTimerRef.current = setTimeout(() => {
          if (isCurrent()) setIsMinimized(true);
        }, AUTO_MINIMIZE_DELAY_MS);
      } catch (error) {
        console.warn("Failed to send SOS alert", error);
        if (isCurrent()) {
          setStage("idle");
          setBlockedReason("unavailable");
        }
      }
    } finally {
      if (isCurrent()) inFlightRef.current = false;
    }
  };

  // Handles both "back out before anything was sent" (confirm/verifying/
  // sending -- just abandon locally, nothing to tell the backend) and "back
  // out of an already-sent SOS" (active -- ask the backend to cancel, since
  // it's the source of truth for whether a responder has since joined).
  const runCancel = async () => {
    const wasActive = stage === "active";
    const activeIncidentId = incidentId;

    attemptIdRef.current += 1;
    inFlightRef.current = false;
    clearMinimizeTimer();

    if (wasActive && activeIncidentId && token) {
      try {
        await cancelSosIncident(token, activeIncidentId);
      } catch (err) {
        if ((err as Partial<ApiError>)?.status === 409) {
          Alert.alert(
            "Can't cancel",
            "A responder has already been assigned to your SOS and is on the way.",
          );
        } else {
          Alert.alert("Couldn't cancel", "Please check your connection and try again.");
        }
        return;
      }
    }

    setStage("idle");
    setIncidentId(null);
    setIsMinimized(false);
  };

  const value = useMemo(
    () => ({
      stage,
      blockedReason,
      isMinimized,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        void runConfirm();
      },
      cancelSOS: () => {
        void runCancel();
      },
      expandSOS: () => setIsMinimized(false),
      minimizeSOS: () => setIsMinimized(true),
      dismissBlocked: () => setBlockedReason(null),
      retryConfirm: () => {
        setBlockedReason(null);
        void runConfirm();
      },
    }),
    [stage, blockedReason, isMinimized, token, incidentId],
  );

  return <SosContext.Provider value={value}>{children}</SosContext.Provider>;
}

export function useSos() {
  const context = useContext(SosContext);

  if (!context) {
    throw new Error("useSos must be used within a SosProvider");
  }

  return context;
}
