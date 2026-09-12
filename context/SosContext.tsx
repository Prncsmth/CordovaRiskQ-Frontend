// context/SosContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

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

  const runConfirm = async () => {
    setStage("verifying");
    const result = await getVerifiedLocation();

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

    setStage("active");
    if (!token) return;

    const locationLabel = `Barangay ${getNearestBarangay(result.coords.latitude, result.coords.longitude).name}, Cordova`;
    triggerSOS(token, result.coords, locationLabel).catch((error) =>
      console.warn("Failed to send SOS alert", error),
    );
  };

  const value = useMemo(
    () => ({
      stage,
      blockedReason,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        void runConfirm();
      },
      cancelSOS: () => setStage("idle"),
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
