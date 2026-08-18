// context/SosContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getCurrentLocation } from "@/services/location.service";
import { triggerSOS } from "@/services/sos.service";

type SosStage = "idle" | "confirm" | "active";

type SosContextValue = {
  stage: SosStage;
  openConfirm: () => void;
  confirmSOS: () => void;
  cancelSOS: () => void;
};

const SosContext = createContext<SosContextValue | undefined>(undefined);

export function SosProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<SosStage>("idle");
  const { token } = useAuth();

  const value = useMemo(
    () => ({
      stage,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        setStage("active");
        if (!token) return;

        getCurrentLocation()
          .then((location) => triggerSOS(token, location))
          .catch((error) => console.warn("Failed to send SOS alert", error));
      },
      cancelSOS: () => setStage("idle"),
    }),
    [stage, token],
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
