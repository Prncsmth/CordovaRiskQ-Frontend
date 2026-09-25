// context/TabBarHeightContext.tsx
// Shared by both the citizen (components/tabs/TabBar.tsx) and responder
// (components/responder/ResponderTabBar.tsx) floating tab bars. Since those
// bars are now `position: "absolute"` overlays (so the page's own
// background/content extends the full screen height behind them, instead of
// being squeezed into a separate reserved row), tab screens need to know how
// much bottom padding clears the floating pill -- this mirrors React
// Navigation's own internal BottomTabBarHeightContext, which isn't part of
// expo-router's public API, so it's reimplemented here rather than
// deep-importing an unexported path that could break across upgrades.
import React, { createContext, useContext, useMemo, useState } from "react";

type TabBarHeightContextValue = {
  height: number;
  setHeight: (height: number) => void;
};

const TabBarHeightContext = createContext<TabBarHeightContextValue | undefined>(undefined);

export function TabBarHeightProvider({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState(0);
  const value = useMemo(() => ({ height, setHeight }), [height]);
  return <TabBarHeightContext.Provider value={value}>{children}</TabBarHeightContext.Provider>;
}

// Read by tab screens to add enough bottom padding/inset to clear the
// floating pill -- already includes the bar's own bottom margin, so callers
// just add their own extra breathing room (e.g. + SPACING.md) on top.
//
// Returns 0 outside a TabBarHeightProvider rather than throwing -- some
// screens (e.g. NotificationsScreen, SettingsScreen) are shared between a
// tab (inside a provider) and a plain pushed stack screen reached another
// way (outside any tab bar at all), where no clearance is needed anyway.
export function useTabBarHeight(): number {
  const context = useContext(TabBarHeightContext);
  return context?.height ?? 0;
}

// Called only by the tab bar components themselves, from their own onLayout.
export function useSetTabBarHeight(): (height: number) => void {
  const context = useContext(TabBarHeightContext);
  if (!context) {
    throw new Error("useSetTabBarHeight must be used within a TabBarHeightProvider");
  }
  return context.setHeight;
}
