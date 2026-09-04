// components/tabs/TabBar.tsx
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSos } from "@/context/SosContext";
import { useTour } from "@/context/TourContext";
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
};

const LEFT_TABS: TabConfig[] = [
  { name: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { name: "map", label: "Map", icon: "map-outline", activeIcon: "map" },
];

const RIGHT_TABS: TabConfig[] = [
  {
    name: "report-history",
    label: "History",
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
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { registerTarget, unregisterTarget, notifyTargetLayout } = useTour();
  const mapTabRef = useRef<View>(null);
  const historyTabRef = useRef<View>(null);
  const profileTabRef = useRef<View>(null);
  const reportTabRef = useRef<TouchableOpacity>(null);

  useEffect(() => {
    registerTarget("map", mapTabRef);
    registerTarget("history", historyTabRef);
    registerTarget("report", reportTabRef);
    registerTarget("profile", profileTabRef);
    return () => {
      unregisterTarget("map", mapTabRef);
      unregisterTarget("history", historyTabRef);
      unregisterTarget("report", reportTabRef);
      unregisterTarget("profile", profileTabRef);
    };
  }, [registerTarget, unregisterTarget]);

  if (stage === "active") return null;

  const activeName = state.routes[state.index].name;
  const fabFocused = activeName === "report";

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
          ref={
            tab.name === "map"
              ? mapTabRef
              : tab.name === "report-history"
                ? historyTabRef
                : tab.name === "profile"
                  ? profileTabRef
                  : undefined
          }
          collapsable={false}
          onLayout={
            tab.name !== "home" ? () => notifyTargetLayout() : undefined
          }
          style={styles.tabContent}
        >
          {focused ? <View style={styles.activeDot} /> : null}
          <Ionicons
            name={focused ? tab.activeIcon : tab.icon}
            size={21}
            color={color}
          />
          <Text style={[styles.label, { color }]}>{tab.label}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.outer, { marginBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.container}>
        <BlurView intensity={70} tint={COLORS.glassTint} style={styles.blur} />
        {LEFT_TABS.map(renderTab)}

        <View style={styles.fabSlot}>
          <TouchableOpacity
            ref={reportTabRef}
            style={styles.fabOuter}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate("report");
            }}
            activeOpacity={0.85}
            onLayout={() => notifyTargetLayout()}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fab}
            >
              <Ionicons name="document-text" size={26} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
          <Text
            style={[
              styles.label,
              styles.fabLabel,
              { color: fabFocused ? COLORS.primary : COLORS.textTertiary },
            ]}
          >
            Report
          </Text>
        </View>

        {RIGHT_TABS.map(renderTab)}
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
      alignItems: "flex-end",
      paddingTop: 10,
      paddingBottom: 8,
      paddingHorizontal: 8,
      borderRadius: RADIUS.xl,
      backgroundColor: COLORS.glassOverlay,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      ...SHADOW_LG,
    },
    blur: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: RADIUS.xl,
      overflow: "hidden",
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

    fabSlot: {
      flex: 1,
      alignItems: "center",
    },

    fabOuter: {
      marginTop: -40, // was -30, now moves it up further
      borderRadius: RADIUS.full,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },

    fab: {
      width: 58,
      height: 58,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 5,
      borderColor: COLORS.background,
    },

    fabLabel: {
      marginTop: 2,
    },
  });
}
