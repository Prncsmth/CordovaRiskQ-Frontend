// context/SosContext.tsx
import React, { createContext, useContext, useMemo, useRef, useState } from "react";

import { getNearestBarangay } from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import { getVerifiedLocation } from "@/services/location.service";
import { triggerSOS } from "@/services/sos.service";
import { isInsideCordova } from "@/utils/geofence";

type SosStage = "idle" | "confirm" | "verifying" | "active";
type SosBlockedReason = "permission" | "unavailable" | null;

type SosContextValue = {
  stage: SosStage;
  blockedReason: SosBlockedReason;
  openConfirm: () => void;
  confirmSOS: () => void;
  cancelSOS: () => void;
  dismissBlocked: () => void;
  retryConfirm: () => void;
};

const SosContext = createContext<SosContextValue | undefined>(undefined);

export function SosProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<SosStage>("idle");
  const [blockedReason, setBlockedReason] = useState<SosBlockedReason>(null);
  const { token } = useAuth();
  const inFlightRef = useRef(false);
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

      setStage("active");

      const locationLabel = `Barangay ${getNearestBarangay(result.coords.latitude, result.coords.longitude).name}, Cordova`;
      try {
        await triggerSOS(token, result.coords, locationLabel);
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

  const value = useMemo(
    () => ({
      stage,
      blockedReason,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        void runConfirm();
      },
      cancelSOS: () => {
        attemptIdRef.current += 1;
        inFlightRef.current = false;
        setStage("idle");
      },
      dismissBlocked: () => setBlockedReason(null),
      retryConfirm: () => {
        setBlockedReason(null);
        void runConfirm();
      },
    }),
    [stage, blockedReason, token],
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
