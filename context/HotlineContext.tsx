// context/HotlineContext.tsx
// App-wide hotline list: one fetch + one socket connection, mirroring
// EvacuationCenterContext -- the Contacts screen reads from here instead of
// its own one-shot fetch, so an admin's edit reaches it live.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { connectToHotlineSocket } from "@/services/hotlineSocket.service";
import { getHotlines, type Hotline } from "@/services/contacts.service";
import { applyHotlineUpdate } from "@/utils/hotlines";

type HotlineContextValue = {
  hotlines: Hotline[];
  isLoading: boolean;
  // Contacts screen falls back to its own last-known-good hardcoded list on
  // a genuine fetch failure (e.g. backend unreachable) -- distinct from
  // "hotlines is just empty," which never happens once seeded.
  loadFailed: boolean;
  refresh: () => Promise<void>;
};

const HotlineContext = createContext<HotlineContextValue | undefined>(undefined);

export function HotlineProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoadFailed(false);
    try {
      const result = await getHotlines(token);
      setHotlines(result);
    } catch {
      setLoadFailed(true);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      // Resetting state when auth drops (e.g. logout) is the same pattern
      // the other realtime contexts already use.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHotlines([]);
      setIsLoading(false);
      setLoadFailed(false);
      return;
    }

    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));

    const disconnect = connectToHotlineSocket(
      token,
      (update) => setHotlines((prev) => applyHotlineUpdate(prev, update)),
      // Reconnecting means the socket was down for some stretch of time --
      // refetch once to catch anything changed while disconnected.
      () => refresh(),
    );

    return disconnect;
  }, [token, refresh]);

  const value = useMemo<HotlineContextValue>(
    () => ({ hotlines, isLoading, loadFailed, refresh }),
    [hotlines, isLoading, loadFailed, refresh],
  );

  return <HotlineContext.Provider value={value}>{children}</HotlineContext.Provider>;
}

export function useHotlines() {
  const context = useContext(HotlineContext);
  if (!context) {
    throw new Error("useHotlines must be used within a HotlineProvider");
  }
  return context;
}
