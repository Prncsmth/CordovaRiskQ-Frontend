// context/SosContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

import { triggerSOS, type SOSLocation } from "@/services/sos.service";

type SosStage = "idle" | "confirm" | "active";

type SosContextValue = {
  stage: SosStage;
  openConfirm: () => void;
  confirmSOS: () => void;
  cancelSOS: () => void;
};

const SosContext = createContext<SosContextValue | undefined>(undefined);

// Best-effort location fetch — the SOS flow must never block on this, so
// failures (permission denied, native module unavailable) just fall back
// to sending the alert without coordinates.
async function getCurrentLocation(): Promise<SOSLocation | undefined> {
  try {
    const module = require("expo-location") as typeof import("expo-location");
    const getCurrentPositionFn =
      (module as any).getCurrentPositionAsync ??
      (module as any).default?.getCurrentPositionAsync;

    if (typeof getCurrentPositionFn !== "function") return undefined;

    const position = await getCurrentPositionFn({});
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return undefined;
  }
}

export function SosProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<SosStage>("idle");

  const value = useMemo(
    () => ({
      stage,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        setStage("active");
        getCurrentLocation().then((location) => triggerSOS(location));
      },
      cancelSOS: () => setStage("idle"),
    }),
    [stage],
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
