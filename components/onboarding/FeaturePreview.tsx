// components/onboarding/FeaturePreview.tsx
// Real screenshot of the screen each onboarding slide is describing
// (app/(onboarding)/app-intro.tsx), shown inside a phone-frame silhouette.
// Assets live in assets/images/onboarding/ -- swap the require() below to
// replace any of them.
//
// "notifications" is the one exception: the real screenshot has
// placeholder/test alert text in it that includes words that must never
// ship in the app, so it renders a plain wireframe instead of that image --
// no blur/overlay is used, because a translucent layer over real text can
// never fully guarantee it stays unreadable across devices. Nothing here
// ever holds the real notifications text.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";

import { RADIUS, SHADOW, useThemeColors, type ColorPalette } from "@/theme";

export type FeaturePreviewType =
  | "sos"
  | "report"
  | "map"
  | "notifications"
  | "history"
  | "hotlines"
  | "responder-dashboard"
  | "responder-new-incident"
  | "responder-live-map"
  | "responder-lobby"
  | "responder-navigate"
  | "responder-notifications";

const IMAGES: Partial<Record<FeaturePreviewType, ImageSourcePropType>> = {
  sos: require("@/assets/images/onboarding/onboarding-sos.png"),
  report: require("@/assets/images/onboarding/onboarding-report.png"),
  map: require("@/assets/images/onboarding/onboarding-map.png"),
  history: require("@/assets/images/onboarding/onboarding-history.png"),
  hotlines: require("@/assets/images/onboarding/onboarding-hotlines.png"),
  "responder-dashboard": require("@/assets/images/onboarding/responder-dashboard.png"),
  "responder-new-incident": require("@/assets/images/onboarding/responder-new-incident.png"),
  "responder-live-map": require("@/assets/images/onboarding/responder-live-map.png"),
  "responder-lobby": require("@/assets/images/onboarding/responder-lobby.png"),
  "responder-navigate": require("@/assets/images/onboarding/responder-navigate.png"),
  "responder-notifications": require("@/assets/images/onboarding/responder-notifications.png"),
};

export default function FeaturePreview({ type }: { type: FeaturePreviewType }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const image = IMAGES[type];

  return (
    <View style={styles.frameWrapper}>
      <View style={styles.sideButtonAction} />
      <View style={styles.sideButtonVolUp} />
      <View style={styles.sideButtonVolDown} />
      <View style={styles.sideButtonPower} />
      <View style={styles.frame}>
        <View style={styles.dynamicIsland} />
        {image ? (
          <Image source={image} style={styles.screenshot} resizeMode="cover" />
        ) : (
          <NotificationsWireframe styles={styles} COLORS={COLORS} />
        )}
      </View>
    </View>
  );
}

function NotificationsWireframe({
  styles,
  COLORS,
}: {
  styles: ReturnType<typeof createStyles>;
  COLORS: ColorPalette;
}) {
  return (
    <View style={styles.wireframeScreen}>
      <View style={styles.wireframeHeaderBar} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.wireframeCard}>
          <View style={styles.wireframeCardDot}>
            <Ionicons name="notifications" size={14} color={COLORS.primary} />
          </View>
          <View style={styles.wireframeCardLines}>
            <View style={styles.wireframeLineBar} />
            <View style={[styles.wireframeLineBar, styles.wireframeLineBarShort]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    // iPhone 16/17 Pro-style silhouette: tall rounded corners, thin
    // titanium-dark bezel, floating Dynamic Island instead of a notch, and
    // small side-button bumps. The buttons sit just outside `frame`'s own
    // bounds, so they live on this wrapper (frame itself clips to its
    // rounded corners via overflow: hidden, which would cut them off).
    frameWrapper: {
      marginBottom: 20,
    },
    frame: {
      width: 170,
      height: 280,
      borderRadius: 34,
      backgroundColor: COLORS.background,
      borderWidth: 5,
      borderColor: COLORS.text,
      alignItems: "center",
      overflow: "hidden",
      ...SHADOW,
    },
    dynamicIsland: {
      position: "absolute",
      top: 10,
      alignSelf: "center",
      width: 70,
      height: 22,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.text,
      zIndex: 1,
    },
    sideButtonAction: {
      position: "absolute",
      left: -2,
      top: 52,
      width: 3,
      height: 18,
      borderRadius: 2,
      backgroundColor: COLORS.text,
    },
    sideButtonVolUp: {
      position: "absolute",
      left: -2,
      top: 82,
      width: 3,
      height: 26,
      borderRadius: 2,
      backgroundColor: COLORS.text,
    },
    sideButtonVolDown: {
      position: "absolute",
      left: -2,
      top: 116,
      width: 3,
      height: 26,
      borderRadius: 2,
      backgroundColor: COLORS.text,
    },
    sideButtonPower: {
      position: "absolute",
      right: -2,
      top: 88,
      width: 3,
      height: 42,
      borderRadius: 2,
      backgroundColor: COLORS.text,
    },
    screenshot: {
      width: "100%",
      height: "100%",
    },
    wireframeScreen: {
      flex: 1,
      width: "100%",
      padding: 12,
      paddingTop: 40,
      gap: 10,
    },
    wireframeHeaderBar: {
      width: "55%",
      height: 8,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
      marginBottom: 4,
    },
    wireframeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 8,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
    },
    wireframeCardDot: {
      width: 26,
      height: 26,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    wireframeCardLines: {
      flex: 1,
      gap: 4,
    },
    wireframeLineBar: {
      height: 6,
      width: "80%",
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
    },
    wireframeLineBarShort: {
      width: "50%",
    },
  });
}
