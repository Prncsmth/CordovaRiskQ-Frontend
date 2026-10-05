import { Tabs } from "expo-router";
import React from "react";

import ContactNumberGate from "@/responder/components/shared/ContactNumberGate";
import ResponderTabBar from "@/responder/components/shared/ResponderTabBar";
import { TabBarHeightProvider } from "@/context/TabBarHeightContext";

export default function ResponderTabLayout() {
  return (
    <TabBarHeightProvider>
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
      {/* Asks for a contact number if this responder has none, so the
          citizen's Call Responder button can always reach them. */}
      <ContactNumberGate />
    </TabBarHeightProvider>
  );
}
