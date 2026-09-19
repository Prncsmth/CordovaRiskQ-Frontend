// components/responder/ResponderTabBar.tsx
// Bottom tab bar for the responder module -- visually mirrors
// components/tabs/TabBar.tsx (citizen) but is its own component: the
// citizen bar is hard-wired to citizen-only routes/context (useSos,
// citizen TourContext targets), and the responder side has no FAB/center
// tab, just 4 even tabs.
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTour, type TourTargetId } from "@/context/TourContext";
import {
  RADIUS,
  SHADOW_LG,
  SPACING,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  // Absent for the Notifications tab -- that target is registered by
  // DashboardScreen's own header bell instead (see the comment there), so
  // the responder tour's "Notifications" step points at the top-of-screen
  // bell rather than this tab icon, matching the citizen tour's own
  // HomeHeader-bell convention.
  targetId?: TourTargetId;
};

const TABS: TabConfig[] = [
  {
    name: "index",
    label: "Dashboard",
    icon: "grid-outline",
    activeIcon: "grid",
    targetId: "responder-dashboard",
  },
  {
    name: "live-map",
    label: "Live Map",
    icon: "map-outline",
    activeIcon: "map",
    targetId: "responder-live-map",
  },
  {
    name: "notifications",
    label: "Alerts",
    icon: "notifications-outline",
    activeIcon: "notifications",
  },
  {
    name: "settings",
    label: "Settings",
    icon: "settings-outline",
    activeIcon: "settings",
    targetId: "responder-settings",
  },
];

export default function ResponderTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { registerTarget, unregisterTarget, notifyTargetLayout } = useTour();
  const dashboardRef = useRef<View>(null);
  const liveMapRef = useRef<View>(null);
  const settingsRef = useRef<View>(null);

  const refByTarget: Partial<Record<TourTargetId, React.RefObject<View | null>>> = {
    "responder-dashboard": dashboardRef,
    "responder-live-map": liveMapRef,
    "responder-settings": settingsRef,
  };

  useEffect(() => {
    for (const tab of TABS) {
      if (!tab.targetId) continue;
      const ref = refByTarget[tab.targetId];
      if (ref) registerTarget(tab.targetId, ref);
    }
    return () => {
      for (const tab of TABS) {
        if (!tab.targetId) continue;
        const ref = refByTarget[tab.targetId];
        if (ref) unregisterTarget(tab.targetId, ref);
      }
    };
    // refByTarget is rebuilt every render (its refs themselves are stable),
    // registering it fresh each time would just churn the same target->ref
    // pairs into the registry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerTarget, unregisterTarget]);

  const activeName = state.routes[state.index].name;

  function renderTab(tab: TabConfig) {
    const focused = activeName === tab.name;
    const color = focused ? COLORS.primary : COLORS.textTertiary;

    return (
      <TouchableOpacity
        key={tab.name}
        style={styles.tab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate(tab.name);
        }}
        activeOpacity={0.7}
      >
        <View
          ref={tab.targetId ? refByTarget[tab.targetId] : undefined}
          collapsable={false}
          onLayout={() => notifyTargetLayout()}
          style={styles.tabContent}
        >
          {focused ? <View style={styles.activeDot} /> : null}
          <Ionicons name={focused ? tab.activeIcon : tab.icon} size={21} color={color} />
          <Text style={[styles.label, { color }]}>{tab.label}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.outer, { marginBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.container}>
        {TABS.map(renderTab)}
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    outer: {
      marginHorizontal: SPACING.md,
    },
    container: {
      flexDirection: "row",
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: RADIUS.xl,
      // Flat, not translucent -- same fix already applied to the map's own
      // floating controls (SearchBar/PinButton/ZoomControls/LocateButton):
      // a BlurView "glass" look read as broken/see-through rather than
      // intentional, so this uses a solid surface color instead.
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      ...SHADOW_LG,
    },
    tab: {
      flex: 1,
      alignItems: "center",
    },
    tabContent: {
      alignItems: "center",
      gap: 4,
      paddingBottom: 2,
    },
    activeDot: {
      position: "absolute",
      top: -6,
      width: 4,
      height: 4,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
    },
  });
}
