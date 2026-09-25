// context/EvacuationCenterContext.tsx
// App-wide evacuation center list: one fetch + one socket connection shared
// by every screen that displays center status/facilities (Home's
// nearest-center card, the Map's markers, the detail screen), so an admin's
// edit reaches all of them live instead of each screen fetching
// independently and going stale until its next manual reload.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { connectToEvacuationCenterSocket } from "@/services/evacuationCenterSocket.service";
import { getEvacuationCenters, type EvacuationCenter } from "@/services/evacuation.service";
import { applyEvacuationCenterUpdate } from "@/utils/evacuationCenters";

type EvacuationCenterContextValue = {
  centers: EvacuationCenter[];
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const EvacuationCenterContext = createContext<EvacuationCenterContextValue | undefined>(
  undefined,
);

export function EvacuationCenterProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getEvacuationCenters(token);
      setCenters(result);
    } catch {
      // Best-effort, same as the screens' own fetches this replaces -- a
      // failed refresh leaves the list at its last known state.
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      // Resetting state when auth drops (e.g. logout) is the same pattern
      // ResponderAlertContext.tsx/NotificationContext.tsx already use.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenters([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));

    const disconnect = connectToEvacuationCenterSocket(
      token,
      (update) => setCenters((prev) => applyEvacuationCenterUpdate(prev, update)),
      // Reconnecting means the socket was down for some stretch of time --
      // refetch once to catch anything changed while disconnected.
      () => refresh(),
    );

    return disconnect;
  }, [token, refresh]);

  const value = useMemo<EvacuationCenterContextValue>(
    () => ({ centers, isLoading, refresh }),
    [centers, isLoading, refresh],
  );

  return (
    <EvacuationCenterContext.Provider value={value}>{children}</EvacuationCenterContext.Provider>
  );
}

export function useEvacuationCenters() {
  const context = useContext(EvacuationCenterContext);
  if (!context) {
    throw new Error("useEvacuationCenters must be used within an EvacuationCenterProvider");
  }
  return context;
}
