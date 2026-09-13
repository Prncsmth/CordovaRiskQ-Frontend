import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as authStorage from "./authStorage";

const PUSH_NOTIFICATIONS_KEY = "push_notifications_enabled";

type PreferencesContextValue = {
  pushNotificationsEnabled: boolean;
  isLoading: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

// Single persisted source of truth for the push-notifications toggle so
// Profile and Settings (both render it) can't drift out of sync the way two
// independent useState(true) locals used to.
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [pushNotificationsEnabled, setPushNotificationsEnabledState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authStorage
      .getItem(PUSH_NOTIFICATIONS_KEY)
      .then((value) => {
        if (value !== null) setPushNotificationsEnabledState(value === "true");
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      pushNotificationsEnabled,
      isLoading,
      setPushNotificationsEnabled: async (enabled: boolean) => {
        setPushNotificationsEnabledState(enabled);
        await authStorage.setItem(PUSH_NOTIFICATIONS_KEY, enabled ? "true" : "false");
      },
    }),
    [pushNotificationsEnabled, isLoading],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }

  return context;
}
