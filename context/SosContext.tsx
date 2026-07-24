// context/SosContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

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

  const value = useMemo(
    () => ({
      stage,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        triggerSOS();
        setStage("active");
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
