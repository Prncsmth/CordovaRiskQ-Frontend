import { Tabs } from "expo-router";
import React from "react";

import ResponderTabBar from "@/components/responder/ResponderTabBar";

export default function ResponderTabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <ResponderTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="live-map" options={{ title: "Live Map" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
