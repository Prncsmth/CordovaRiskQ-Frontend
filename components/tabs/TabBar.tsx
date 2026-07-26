// components/tabs/TabBar.tsx
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSos } from "@/context/SosContext";
import { COLORS, RADIUS } from "@/theme";

type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const LEFT_TABS: TabConfig[] = [
  { name: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { name: "map", label: "Map", icon: "map-outline", activeIcon: "map" },
];

const RIGHT_TABS: TabConfig[] = [
  {
    name: "report-history",
    label: "Report History",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  {
    name: "profile",
    label: "Profile",
    icon: "person-outline",
    activeIcon: "person",
  },
];

export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { stage } = useSos();

  if (stage !== "idle") return null;

  const activeName = state.routes[state.index].name;
  const fabFocused = activeName === "report";

  function renderTab(tab: TabConfig) {
    const focused = activeName === tab.name;
    const color = focused ? COLORS.primary : COLORS.textTertiary;

    return (
      <TouchableOpacity
        key={tab.name}
        style={styles.tab}
        onPress={() => navigation.navigate(tab.name)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={focused ? tab.activeIcon : tab.icon}
          size={21}
          color={color}
        />
        <Text style={[styles.label, { color }]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {LEFT_TABS.map(renderTab)}

      <View style={styles.fabSlot}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("report")}
          activeOpacity={0.85}
        >
          <Ionicons name="document-text" size={26} color={COLORS.white} />
        </TouchableOpacity>
        <Text
          style={[
            styles.label,
            styles.fabLabel,
            { color: fabFocused ? COLORS.primary : COLORS.textTertiary },
          ]}
        >
          {" "}
          Report
        </Text>
      </View>

      {RIGHT_TABS.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMuted,
    backgroundColor: COLORS.background,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingBottom: 2,
  },

  label: {
    fontSize: 10,
    fontWeight: "600",
  },

  fabSlot: {
    flex: 1,
    alignItems: "center",
  },

  fab: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: -30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: COLORS.background,
  },
  fabLabel: {
    marginTop: 4,
  },
});
